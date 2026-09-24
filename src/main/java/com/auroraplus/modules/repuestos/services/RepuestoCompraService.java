package com.auroraplus.modules.repuestos.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.modules.repuestos.entities.*;
import com.auroraplus.modules.repuestos.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Registra facturas de compra a proveedores: sube el stock de cada ítem
 * comprado, actualiza su costo unitario, y deja registro en el Kárdex
 * (MovimientoRepuesto) — la pieza que le faltaba al módulo de Repuestos
 * para poder operar como una ferretería real.
 */
@Service
public class RepuestoCompraService {

    @Autowired
    private AlmacenService almacenService;

    @Autowired
    private CompraRepuestoRepository compraRepuestoRepository;

    @Autowired
    private ProveedorRepuestoRepository proveedorRepuestoRepository;

    @Autowired
    private RepuestoItemRepository repuestoItemRepository;

    @Autowired
    private MovimientoRepuestoRepository movimientoRepuestoRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    public static class ItemCompra {
        public Long repuestoId;
        public BigDecimal cantidad;
        public BigDecimal costoUnitario;
        public BigDecimal precioVenta;
    }

    @Transactional
    public CompraRepuesto registrarCompra(Long tenantId, Long proveedorId, String numeroFactura, List<ItemCompra> items) {
        return registrarCompra(tenantId, proveedorId, numeroFactura, items, null, null, null);
    }

    /**
     * @param montoPagadoAhora cuánto se le pagó al proveedor de una vez, en `monedaPago` — null/0 = factura entera
     *                         a crédito. Si es menor al total, la diferencia queda como cuenta por pagar (CXP)
     *                         normal; si cubre el total, no se crea CXP alguna (factura saldada de una). Mismo
     *                         patrón que CompraInsumoHorecaService.registrarCompra.
     * @param diasCredito      plazo de crédito pactado con el proveedor — se guarda como fecha de vencimiento
     *                         = hoy + diasCredito en la CXP resultante. Null/0 = sin plazo pactado.
     */
    @Transactional
    public CompraRepuesto registrarCompra(Long tenantId, Long proveedorId, String numeroFactura, List<ItemCompra> items,
                                           BigDecimal montoPagadoAhora, String monedaPago, Integer diasCredito) {
        if (items == null || items.isEmpty()) {
            throw new RuntimeException("La compra debe tener al menos un ítem");
        }

        ProveedorRepuesto proveedor = proveedorRepuestoRepository.findById(proveedorId)
            .orElseThrow(() -> new RuntimeException("Proveedor no encontrado"));

        if (!proveedor.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Proveedor no pertenece a este tenant");
        }

        CompraRepuesto compra = new CompraRepuesto();
        compra.setTenantId(tenantId);
        compra.setProveedor(proveedor);
        compra.setNumeroFactura(numeroFactura);
        compra.setFechaCompra(LocalDateTime.now());

        BigDecimal totalCompra = BigDecimal.ZERO;

        for (ItemCompra itemCompra : items) {
            if (itemCompra.cantidad == null || itemCompra.cantidad.compareTo(BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("La cantidad comprada debe ser mayor a cero");
            }
            if (itemCompra.costoUnitario == null || itemCompra.costoUnitario.compareTo(BigDecimal.ZERO) < 0) {
                throw new RuntimeException("El costo unitario no puede ser negativo");
            }

            // Con bloqueo: si una venta toca el mismo repuesto a la vez, espera en vez de pisar el stock.
            RepuestoItem repuesto = repuestoItemRepository.buscarConBloqueoPesimista(itemCompra.repuestoId)
                .orElseThrow(() -> new RuntimeException("Repuesto no encontrado: " + itemCompra.repuestoId));

            if (!repuesto.getTenantId().equals(tenantId)) {
                throw new RuntimeException("Violación de seguridad: Repuesto no pertenece a este tenant");
            }

            BigDecimal stockAnterior = repuesto.getStockActual();
            BigDecimal stockNuevo = stockAnterior.add(itemCompra.cantidad);
            repuesto.setStockActual(stockNuevo);
            repuesto.setCostoUnitario(itemCompra.costoUnitario); // último costo de compra
            if (itemCompra.precioVenta != null && itemCompra.precioVenta.compareTo(BigDecimal.ZERO) > 0) {
                repuesto.setPrecioVenta(itemCompra.precioVenta);
            }
            repuestoItemRepository.save(repuesto);
            almacenService.alinear(tenantId, repuesto.getId(), repuesto.getStockActual());

            BigDecimal subtotal = itemCompra.cantidad.multiply(itemCompra.costoUnitario);
            totalCompra = totalCompra.add(subtotal);

            DetalleCompraRepuesto detalle = new DetalleCompraRepuesto();
            detalle.setTenantId(tenantId);
            detalle.setRepuesto(repuesto);
            detalle.setCantidad(itemCompra.cantidad);
            detalle.setCostoUnitario(itemCompra.costoUnitario);
            detalle.setSubtotal(subtotal);
            compra.addItem(detalle);

            MovimientoRepuesto movimiento = new MovimientoRepuesto();
            movimiento.setTenantId(tenantId);
            movimiento.setRepuesto(repuesto);
            movimiento.setTipo(MovimientoRepuesto.TipoMovimiento.COMPRA);
            movimiento.setCantidad(itemCompra.cantidad);
            movimiento.setStockAnterior(stockAnterior);
            movimiento.setStockNuevo(stockNuevo);
            movimiento.setMotivo("Compra factura " + numeroFactura + " — Proveedor: " + proveedor.getNombre());
            movimientoRepuestoRepository.save(movimiento);
        }

        compra.setTotal(totalCompra);

        // Si se pagó algo de una vez, sale de caja como EGRESO real (en la moneda en la
        // que físicamente se entregó) y solo la diferencia (si queda) se registra como
        // deuda (CXP) — antes SIEMPRE se cargaba el total entero a cuenta por pagar,
        // aunque el negocio le hubiera pagado de contado al proveedor. Mismo patrón que
        // CompraInsumoHorecaService.registrarCompra.
        BigDecimal montoPagadoBase = BigDecimal.ZERO;
        if (montoPagadoAhora != null && montoPagadoAhora.compareTo(BigDecimal.ZERO) > 0) {
            String monedaEfectiva = (monedaPago != null && !monedaPago.isBlank()) ? monedaPago : motorFinancieroService.obtenerMonedaBase(tenantId);
            montoPagadoBase = monedaEfectiva.equals(motorFinancieroService.obtenerMonedaBase(tenantId))
                ? montoPagadoAhora
                : motorFinancieroService.convertirAMonedaBase(tenantId, montoPagadoAhora, monedaEfectiva);
            if (montoPagadoBase.compareTo(totalCompra) > 0) {
                throw new RuntimeException("El monto pagado (" + montoPagadoBase + ") no puede ser mayor al total de la factura (" + totalCompra + ")");
            }
            motorFinancieroService.registrarMovimientoEnMoneda(tenantId, MovimientoCaja.TipoMovimiento.EGRESO,
                montoPagadoAhora, monedaEfectiva, "Pago a proveedor " + proveedor.getNombre() + " — Factura " + numeroFactura);
            compra.setMontoPagado(montoPagadoBase.setScale(2, RoundingMode.HALF_UP));
        }
        CompraRepuesto guardada = compraRepuestoRepository.save(compra);

        BigDecimal saldoPendiente = totalCompra.subtract(montoPagadoBase).setScale(2, RoundingMode.HALF_UP);
        if (saldoPendiente.compareTo(BigDecimal.ZERO) > 0) {
            LocalDate fechaVencimiento = (diasCredito != null && diasCredito > 0) ? LocalDate.now().plusDays(diasCredito) : null;
            motorFinancieroService.registrarMovimientoMultiMoneda(tenantId, MovimientoCaja.TipoMovimiento.CXP,
                saldoPendiente, null, null, "Compra factura " + numeroFactura + " — Proveedor: " + proveedor.getNombre(),
                "COMERCIO", "CompraRepuesto", guardada.getId(), fechaVencimiento);
        }

        return guardada;
    }
}
