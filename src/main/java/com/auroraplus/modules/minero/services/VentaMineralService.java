package com.auroraplus.modules.minero.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.core.sync.IdempotenciaService;
import com.auroraplus.modules.minero.entities.DetalleVentaMineral;
import com.auroraplus.modules.minero.entities.TransformacionMineral;
import com.auroraplus.modules.minero.entities.VentaMineral;
import com.auroraplus.modules.minero.repositories.TransformacionMineralRepository;
import com.auroraplus.modules.minero.repositories.VentaMineralRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class VentaMineralService {

    @Autowired
    private VentaMineralRepository ventaMineralRepository;

    @Autowired
    private TransformacionMineralRepository transformacionMineralRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    @Autowired
    private IdempotenciaService idempotenciaService;

    public static class ItemVentaMineral {
        public String producto;
        public BigDecimal cantidad;
        public BigDecimal precioUnitario;
        // Opcional: lote de TransformacionMineral del que sale este producto ya
        // clasificado (GRANO/MENUDO/FINO). Si se indica, se valida y descuenta el
        // disponible real de ese lote — no se puede vender más de lo transformado.
        public Long transformacionId;
    }

    @Transactional
    public VentaMineral registrarVenta(Long tenantId, String numeroFactura, String comprador, List<ItemVentaMineral> items) {
        return registrarVenta(tenantId, numeroFactura, comprador, items, null, null, null);
    }

    @Transactional
    public VentaMineral registrarVenta(Long tenantId, String numeroFactura, String comprador, List<ItemVentaMineral> items,
                                        String monedaPago, BigDecimal montoRecibido) {
        return registrarVenta(tenantId, numeroFactura, comprador, items, monedaPago, montoRecibido, null);
    }

    /**
     * claveIdempotencia: opcional — la usa el POS offline para evitar que un
     * reintento (tras perder la respuesta por corte de conexión) duplique la
     * venta. Si ya se procesó esa clave para este tenant, se retorna la venta
     * ya creada sin repetir ningún trabajo (ni descuento de lote, ni ingreso
     * de caja otra vez).
     */
    @Transactional
    public VentaMineral registrarVenta(Long tenantId, String numeroFactura, String comprador, List<ItemVentaMineral> items,
                                        String monedaPago, BigDecimal montoRecibido, String claveIdempotencia) {
        Optional<Long> existente = idempotenciaService.obtenerSiYaProcesada(tenantId, claveIdempotencia);
        if (existente.isPresent()) {
            return ventaMineralRepository.findById(existente.get())
                .orElseThrow(() -> new RuntimeException("Operación idempotente inconsistente: venta " + existente.get() + " no encontrada"));
        }

        if (items == null || items.isEmpty()) {
            throw new RuntimeException("La venta debe tener al menos un ítem");
        }

        VentaMineral venta = new VentaMineral();
        venta.setTenantId(tenantId);
        venta.setNumeroFactura(numeroFactura);
        venta.setComprador(comprador);
        venta.setFecha(LocalDateTime.now());

        BigDecimal totalVenta = BigDecimal.ZERO;

        for (ItemVentaMineral item : items) {
            if (item.cantidad == null || item.cantidad.compareTo(BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("La cantidad debe ser mayor a cero");
            }
            if (item.precioUnitario == null || item.precioUnitario.compareTo(BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("El precio unitario debe ser mayor a cero");
            }

            BigDecimal subtotal = item.cantidad.multiply(item.precioUnitario).setScale(2, RoundingMode.HALF_UP);
            totalVenta = totalVenta.add(subtotal);

            DetalleVentaMineral detalle = new DetalleVentaMineral();
            detalle.setTenantId(tenantId);
            detalle.setProducto(item.producto);
            detalle.setCantidad(item.cantidad);
            detalle.setPrecioUnitario(item.precioUnitario);
            detalle.setSubtotal(subtotal);

            if (item.transformacionId != null) {
                TransformacionMineral lote = transformacionMineralRepository.findById(item.transformacionId)
                    .orElseThrow(() -> new RuntimeException("Lote de transformación no encontrado: " + item.transformacionId));
                if (!lote.getTenantId().equals(tenantId)) {
                    throw new RuntimeException("Violación de seguridad: el lote no pertenece a este tenant");
                }
                descontarDeLote(lote, item.producto, item.cantidad);
                transformacionMineralRepository.save(lote);
                detalle.setTransformacion(lote);
            }

            venta.addItem(detalle);
        }

        venta.setTotal(totalVenta);
        VentaMineral guardada = ventaMineralRepository.save(venta);

        motorFinancieroService.registrarMovimientoMultiMoneda(tenantId, MovimientoCaja.TipoMovimiento.INGRESO,
            totalVenta, monedaPago, montoRecibido,
            "Venta de mineral factura " + numeroFactura + (comprador != null ? " — Comprador: " + comprador : ""));

        idempotenciaService.registrar(tenantId, claveIdempotencia, "venta_minero", guardada.getId());

        return guardada;
    }

    // Valida y descuenta del lote la cantidad vendida, según el producto
    // (GRANO/MENUDO/FINO). Revienta si no alcanza el disponible del lote —
    // así nunca se vende más de lo que realmente salió de la zaranda.
    private void descontarDeLote(TransformacionMineral lote, String producto, BigDecimal cantidad) {
        String p = producto == null ? "" : producto.trim().toUpperCase();
        BigDecimal disponible;
        switch (p) {
            case "GRANO" -> disponible = lote.getCantidadGranoDisponible();
            case "MENUDO" -> disponible = lote.getCantidadMenudoDisponible();
            case "FINO" -> disponible = lote.getCantidadFinoDisponible();
            default -> throw new RuntimeException(
                "El producto '" + producto + "' no se puede vender referenciando un lote (solo GRANO, MENUDO o FINO)");
        }

        if (cantidad.compareTo(disponible) > 0) {
            throw new RuntimeException("Stock insuficiente en el lote " + lote.getId() + " para " + p
                + ": disponible " + disponible + ", solicitado " + cantidad);
        }

        BigDecimal restante = disponible.subtract(cantidad);
        switch (p) {
            case "GRANO" -> lote.setCantidadGranoDisponible(restante);
            case "MENUDO" -> lote.setCantidadMenudoDisponible(restante);
            case "FINO" -> lote.setCantidadFinoDisponible(restante);
        }
    }
}
