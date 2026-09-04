package com.auroraplus.modules.repuestos.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.modules.repuestos.entities.*;
import com.auroraplus.modules.repuestos.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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
    }

    @Transactional
    public CompraRepuesto registrarCompra(Long tenantId, Long proveedorId, String numeroFactura, List<ItemCompra> items) {
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

            RepuestoItem repuesto = repuestoItemRepository.findById(itemCompra.repuestoId)
                .orElseThrow(() -> new RuntimeException("Repuesto no encontrado: " + itemCompra.repuestoId));

            if (!repuesto.getTenantId().equals(tenantId)) {
                throw new RuntimeException("Violación de seguridad: Repuesto no pertenece a este tenant");
            }

            BigDecimal stockAnterior = repuesto.getStockActual();
            BigDecimal stockNuevo = stockAnterior.add(itemCompra.cantidad);
            repuesto.setStockActual(stockNuevo);
            repuesto.setCostoUnitario(itemCompra.costoUnitario); // último costo de compra
            repuestoItemRepository.save(repuesto);

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
        CompraRepuesto guardada = compraRepuestoRepository.save(compra);

        // Comprar a un proveedor genera una deuda (Cuenta por Pagar), no un
        // egreso de caja inmediato — la mayoría de ferreterías compran a
        // crédito y pagan después. El egreso real se registra al pagar.
        // La deuda queda en la moneda base del tenant (el proveedor factura en la
        // moneda con la que el negocio opera) — sin conversión, no aplica pago aquí.
        motorFinancieroService.registrarMovimientoMultiMoneda(tenantId, MovimientoCaja.TipoMovimiento.CXP,
            totalCompra, null, null, "Compra factura " + numeroFactura + " — Proveedor: " + proveedor.getNombre());

        return guardada;
    }
}
