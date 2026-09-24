package com.auroraplus.modules.comercio.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.auroraplus.core.config.CorreoService;
import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.modules.comercio.entities.PedidoWebComercio;
import com.auroraplus.modules.comercio.repositories.PedidoWebComercioRepository;
import com.auroraplus.modules.repuestos.services.RepuestoConversionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Confirmar un pedido web ANTES de esto era solo cambiarle la etiqueta de estado
 * (ver CatalogoGestionController.actualizarEstadoPedido) — no descontaba inventario,
 * no registraba el ingreso en caja, no sumaba a la utilidad. Un pedido "completado"
 * no dejaba ningún rastro contable real, como si nunca hubiera pasado.
 *
 * Esta confirmación cobra el pedido entero como un ticket del POS
 * (RepuestoConversionService.venderTicket): mismo descuento de stock, mismo registro de
 * caja, mismo Kárdex y el mismo cálculo de IVA, IGTF y delivery, con su renglón en el
 * libro de ventas. Antes se vendía línea por línea sin impuestos ni libro. El precio se recalcula al momento de confirmar (nunca se confía en
 * el total que quedó congelado cuando se hizo el pedido): si el precio cambió desde
 * entonces, el ingreso real refleja el precio actual, igual que cualquier venta.
 */
@Service
public class ConfirmacionPedidoWebService {

    private static final Logger log = LoggerFactory.getLogger(ConfirmacionPedidoWebService.class);

    @Autowired
    private PedidoWebComercioRepository pedidoWebRepository;

    @Autowired
    private RepuestoConversionService repuestoConversionService;

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private CorreoService correoService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public PedidoWebComercio confirmar(Long tenantId, Long pedidoId) {
        PedidoWebComercio pedido = pedidoWebRepository.findById(pedidoId)
            .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));
        if (!pedido.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: el pedido no pertenece a este tenant");
        }
        if (!"PENDIENTE".equals(pedido.getEstado())) {
            throw new RuntimeException("Este pedido ya fue procesado (estado actual: " + pedido.getEstado() + ") — no se puede confirmar dos veces");
        }
        if (pedido.getItemsEstructuradosJson() == null || pedido.getItemsEstructuradosJson().isBlank()) {
            throw new RuntimeException("Este pedido no tiene artículos vinculados a inventario real (fue creado antes de esta función) — ajusta stock y caja manualmente y márcalo como Rechazado/Reabrir según corresponda");
        }

        List<Map<String, Object>> items;
        try {
            items = objectMapper.readValue(pedido.getItemsEstructuradosJson(), List.class);
        } catch (Exception e) {
            throw new RuntimeException("No se pudo leer el detalle del pedido: " + e.getMessage());
        }
        if (items.isEmpty()) {
            throw new RuntimeException("Este pedido no tiene artículos que confirmar");
        }

        List<RepuestoConversionService.LineaTicket> lineas = new ArrayList<>();
        for (Map<String, Object> item : items) {
            String productoId = String.valueOf(item.get("productoId"));
            String nombre = String.valueOf(item.getOrDefault("nombre", productoId));
            if (productoId == null || !productoId.startsWith("rep-")) {
                throw new RuntimeException("El artículo \"" + nombre + "\" no está vinculado a un producto de inventario real (" + productoId
                    + ") — no se puede confirmar automáticamente. Regístralo manualmente en Ingresos & Gastos y usa Rechazar/Reabrir para cerrar este pedido.");
            }
            Long repuestoId = Long.parseLong(productoId.substring(4));
            BigDecimal cantidad = new BigDecimal(String.valueOf(item.get("cantidad")));
            lineas.add(new RepuestoConversionService.LineaTicket(repuestoId, null, cantidad));
        }

        // El cliente ya pagó por fuera (pago móvil, Zelle, Binance...) antes de que el dueño
        // confirme: esto es la reconciliación de ese cobro, en la moneda base del negocio. El
        // IGTF depende de si ese pago fue en divisas; el delivery, del tipo de entrega elegido.
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId).orElse(null);
        BigDecimal delivery = "DELIVERY".equalsIgnoreCase(pedido.getTipoEntrega()) && licencia != null
            ? licencia.getCostoEnvioDelivery() : null;
        RepuestoConversionService.OpcionesFiscales fiscal = new RepuestoConversionService.OpcionesFiscales(
            null, delivery, null, null, esPagoEnDivisas(pedido.getMetodoPago()), "WEB");
        // "WEB-<id>" y no el número PED-xxxx, que es aleatorio de 4 cifras y puede repetirse.
        RepuestoConversionService.ResultadoTicket cobro = repuestoConversionService.venderTicket(tenantId, "WEB-" + pedido.getId(), lineas, null, null, null, null, null,
            pedido.getMetodoPago(), null, null, null, pedido.getClienteNombre(), fiscal);

        if (cobro.total() != null) {
            // El total final (con IVA, IGTF y delivery recalculados al confirmar) es el que ve el cliente en el correo.
            pedido.setTotalUsd(cobro.total());
            if (pedido.getTasaCambio() != null) pedido.setTotalBs(cobro.desglose().subtotal().multiply(pedido.getTasaCambio()).setScale(2, java.math.RoundingMode.HALF_UP));
        }
        pedido.setEstado("COMPLETADO");
        PedidoWebComercio guardado = pedidoWebRepository.save(pedido);

        // El correo es "mejor esfuerzo": si el cliente no dejó email, o el envío falla
        // (SMTP caído, dirección inválida), el pedido de todas formas ya quedó
        // confirmado de verdad (inventario y caja ya se movieron arriba) — no tiene
        // sentido revertir una venta real por un correo que no salió.
        if (guardado.getClienteEmail() != null && !guardado.getClienteEmail().isBlank()) {
            try {
                enviarComprobantePorCorreo(guardado, items);
            } catch (Exception e) {
                log.warn("No se pudo enviar el comprobante por correo del pedido {}: {}", guardado.getNumeroPedido(), e.getMessage());
            }
        }

        return guardado;
    }

    /** Métodos del catálogo que se pagan en divisas (llevan IGTF); pago móvil y efectivo en Bs no. */
    static boolean esPagoEnDivisas(String metodoPago) {
        if (metodoPago == null) return false;
        return switch (metodoPago.trim().toUpperCase()) {
            case "EFECTIVO_USD", "ZELLE", "BINANCE", "BANCOLOMBIA" -> true;
            default -> false;
        };
    }

    private void enviarComprobantePorCorreo(PedidoWebComercio pedido, List<Map<String, Object>> items) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(pedido.getTenantId()).orElse(null);
        String nombreTienda = licencia != null && licencia.getNombreEmpresa() != null ? licencia.getNombreEmpresa() : "Tu tienda";

        StringBuilder filas = new StringBuilder();
        for (Map<String, Object> item : items) {
            filas.append("<tr><td style='padding:4px 8px;border-bottom:1px solid #eee;'>")
                .append(item.getOrDefault("cantidad", "")).append("x ")
                .append(item.getOrDefault("nombre", ""))
                .append("</td></tr>");
        }

        String cuerpo = "<div style='font-family:Arial,sans-serif;max-width:480px;margin:0 auto;'>"
            + "<h2 style='color:#111;'>Pedido confirmado — " + nombreTienda + "</h2>"
            + "<p style='color:#555;'>Tu pedido <strong>#" + pedido.getNumeroPedido() + "</strong> fue confirmado y procesado.</p>"
            + "<table style='width:100%;margin:12px 0;'>" + filas + "</table>"
            + "<p style='font-size:18px;font-weight:bold;color:#111;'>Total: $" + pedido.getTotalUsd().setScale(2, java.math.RoundingMode.HALF_UP) + " USD</p>"
            + "<p style='color:#999;font-size:12px;'>Este es un comprobante automático de " + nombreTienda + ", generado por Aurora Plus.</p>"
            + "</div>";

        correoService.enviarHtml(pedido.getClienteEmail(), "Pedido #" + pedido.getNumeroPedido() + " confirmado — " + nombreTienda, cuerpo);
    }
}
