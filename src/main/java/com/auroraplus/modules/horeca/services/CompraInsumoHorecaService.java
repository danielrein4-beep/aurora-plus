package com.auroraplus.modules.horeca.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.core.inventario.entities.Kardex;
import com.auroraplus.core.inventario.repositories.ArticuloRepository;
import com.auroraplus.core.inventario.services.InventarioService;
import com.auroraplus.modules.horeca.entities.CompraInsumoHoreca;
import com.auroraplus.modules.horeca.entities.DetalleCompraInsumoHoreca;
import com.auroraplus.modules.horeca.entities.ProveedorHoreca;
import com.auroraplus.modules.horeca.repositories.CompraInsumoHorecaRepository;
import com.auroraplus.modules.horeca.repositories.ProveedorHorecaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Compra de insumos a proveedor (Compras y Gestión de Proveedores): sube
 * stock del inventario base y actualiza el costo vigente de cada artículo
 * (que es lo que alimenta el costeo dinámico por gramos de las recetas).
 * El historial de precios queda disponible gratis vía el Kárdex del artículo
 * (GET /api/inventario/articulos/{id}/kardex) — cada entrada trae el
 * costoUnitario de ese momento, no hace falta una tabla aparte.
 */
@Service
public class CompraInsumoHorecaService {

    @Autowired
    private CompraInsumoHorecaRepository compraInsumoHorecaRepository;

    @Autowired
    private ProveedorHorecaRepository proveedorHorecaRepository;

    @Autowired
    private ArticuloRepository articuloRepository;

    @Autowired
    private InventarioService inventarioService;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    public static class ItemCompraInsumo {
        public Long articuloId;
        public BigDecimal cantidad;
        public BigDecimal costoUnitario;
    }

    @Transactional
    public CompraInsumoHoreca registrarCompra(Long tenantId, Long proveedorId, String numeroFactura, List<ItemCompraInsumo> items) {
        if (items == null || items.isEmpty()) {
            throw new RuntimeException("La compra debe tener al menos un ítem");
        }

        ProveedorHoreca proveedor = proveedorHorecaRepository.findById(proveedorId)
            .orElseThrow(() -> new RuntimeException("Proveedor no encontrado"));
        if (!proveedor.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Proveedor no pertenece a este tenant");
        }

        CompraInsumoHoreca compra = new CompraInsumoHoreca();
        compra.setTenantId(tenantId);
        compra.setProveedor(proveedor);
        compra.setNumeroFactura(numeroFactura);
        compra.setFechaCompra(LocalDateTime.now());

        BigDecimal totalCompra = BigDecimal.ZERO;

        for (ItemCompraInsumo item : items) {
            if (item.cantidad == null || item.cantidad.compareTo(BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("La cantidad comprada debe ser mayor a cero");
            }
            if (item.costoUnitario == null || item.costoUnitario.compareTo(BigDecimal.ZERO) < 0) {
                throw new RuntimeException("El costo unitario no puede ser negativo");
            }

            Articulo articulo = articuloRepository.findById(item.articuloId)
                .orElseThrow(() -> new RuntimeException("Artículo no encontrado: " + item.articuloId));
            if (!articulo.getTenantId().equals(tenantId)) {
                throw new RuntimeException("Violación de seguridad: Artículo no pertenece a este tenant");
            }

            // El costo vigente se actualiza al último precio de compra — es lo que
            // alimenta el costeo dinámico de las recetas (EscandalloService.recalcularCosto).
            articulo.setCostoUnitario(item.costoUnitario);
            articuloRepository.save(articulo);

            inventarioService.registrarMovimientoKardex(articulo.getId(), tenantId, Kardex.TipoOperacion.ENTRADA,
                item.cantidad, item.costoUnitario, "Compra factura " + numeroFactura + " — Proveedor: " + proveedor.getNombre());

            BigDecimal subtotal = item.cantidad.multiply(item.costoUnitario);
            totalCompra = totalCompra.add(subtotal);

            DetalleCompraInsumoHoreca detalle = new DetalleCompraInsumoHoreca();
            detalle.setTenantId(tenantId);
            detalle.setArticulo(articulo);
            detalle.setCantidad(item.cantidad);
            detalle.setCostoUnitario(item.costoUnitario);
            detalle.setSubtotal(subtotal);
            compra.addItem(detalle);
        }

        compra.setTotal(totalCompra);
        CompraInsumoHoreca guardada = compraInsumoHorecaRepository.save(compra);

        motorFinancieroService.registrarMovimientoMultiMoneda(tenantId, MovimientoCaja.TipoMovimiento.CXP,
            totalCompra, null, null, "Compra de insumos factura " + numeroFactura + " — Proveedor: " + proveedor.getNombre());

        return guardada;
    }
}
