package com.auroraplus.modules.moda.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.modules.moda.entities.*;
import com.auroraplus.modules.moda.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Factura de compra a proveedor para Moda: mismo patrón que
 * RepuestoCompraService — sube stock de cada variante, actualiza el costo del
 * producto padre, deja rastro en el Kárdex, y registra la deuda como CXP (no
 * como egreso inmediato — se paga después, no al momento de recibir mercancía).
 */
@Service
public class ModaCompraService {

    @Autowired
    private CompraModaRepository compraModaRepository;

    @Autowired
    private ProveedorModaRepository proveedorModaRepository;

    @Autowired
    private VarianteModaRepository varianteModaRepository;

    @Autowired
    private ProductoModaRepository productoModaRepository;

    @Autowired
    private MovimientoModaRepository movimientoModaRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    public static class ItemCompra {
        public Long varianteId;
        public BigDecimal cantidad;
        public BigDecimal costoUnitario;
    }

    @Transactional
    public CompraModa registrarCompra(Long tenantId, Long proveedorId, String numeroFactura, List<ItemCompra> items) {
        if (items == null || items.isEmpty()) {
            throw new RuntimeException("La compra debe tener al menos un ítem");
        }

        ProveedorModa proveedor = proveedorModaRepository.findById(proveedorId)
            .orElseThrow(() -> new RuntimeException("Proveedor no encontrado"));

        if (!proveedor.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Proveedor no pertenece a este tenant");
        }

        CompraModa compra = new CompraModa();
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

            VarianteModa variante = varianteModaRepository.findById(itemCompra.varianteId)
                .orElseThrow(() -> new RuntimeException("Variante no encontrada: " + itemCompra.varianteId));

            if (!variante.getTenantId().equals(tenantId)) {
                throw new RuntimeException("Violación de seguridad: Variante no pertenece a este tenant");
            }

            BigDecimal stockAnterior = variante.getStockActual();
            BigDecimal stockNuevo = stockAnterior.add(itemCompra.cantidad);
            variante.setStockActual(stockNuevo);
            varianteModaRepository.save(variante);

            // El costo se registra a nivel de producto padre (todas las variantes de un
            // mismo modelo comparten el mismo costo de fabricación/compra).
            ProductoModa producto = variante.getProducto();
            producto.setCostoUnitario(itemCompra.costoUnitario);
            productoModaRepository.save(producto);

            BigDecimal subtotal = itemCompra.cantidad.multiply(itemCompra.costoUnitario);
            totalCompra = totalCompra.add(subtotal);

            DetalleCompraModa detalle = new DetalleCompraModa();
            detalle.setTenantId(tenantId);
            detalle.setVariante(variante);
            detalle.setCantidad(itemCompra.cantidad);
            detalle.setCostoUnitario(itemCompra.costoUnitario);
            detalle.setSubtotal(subtotal);
            compra.addItem(detalle);

            MovimientoModa movimiento = new MovimientoModa();
            movimiento.setTenantId(tenantId);
            movimiento.setVariante(variante);
            movimiento.setTipo(MovimientoModa.TipoMovimiento.COMPRA);
            movimiento.setCantidad(itemCompra.cantidad);
            movimiento.setStockAnterior(stockAnterior);
            movimiento.setStockNuevo(stockNuevo);
            movimiento.setMotivo("Compra factura " + numeroFactura + " — Proveedor: " + proveedor.getNombre());
            movimientoModaRepository.save(movimiento);
        }

        compra.setTotal(totalCompra);
        CompraModa guardada = compraModaRepository.save(compra);

        motorFinancieroService.registrarMovimientoMultiMoneda(tenantId, MovimientoCaja.TipoMovimiento.CXP,
            totalCompra, null, null, "Compra factura " + numeroFactura + " — Proveedor: " + proveedor.getNombre());

        return guardada;
    }
}
