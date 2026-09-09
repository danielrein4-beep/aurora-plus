package com.auroraplus.modules.retail.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.core.inventario.entities.Kardex;
import com.auroraplus.core.inventario.entities.LoteArticulo;
import com.auroraplus.core.inventario.entities.PresentacionArticulo;
import com.auroraplus.core.inventario.repositories.ArticuloRepository;
import com.auroraplus.core.inventario.repositories.LoteArticuloRepository;
import com.auroraplus.core.inventario.repositories.PresentacionArticuloRepository;
import com.auroraplus.core.inventario.services.InventarioService;
import com.auroraplus.modules.retail.entities.CompraRetail;
import com.auroraplus.modules.retail.entities.DetalleCompraRetail;
import com.auroraplus.modules.retail.entities.ProveedorRetail;
import com.auroraplus.modules.retail.repositories.CompraRetailRepository;
import com.auroraplus.modules.retail.repositories.ProveedorRetailRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Compra a proveedor de Aurora Retail (Ferretería/Farmacia/Repuestos) — mismo
 * patrón que CompraInsumoHorecaService (conversión de moneda del costo,
 * compra por presentación, lote si hay vencimiento, pago parcial de contado
 * + CXP por el saldo), replicado acá para no acoplar Retail a Horeca.
 */
@Service
public class RetailCompraService {

    @Autowired
    private CompraRetailRepository compraRetailRepository;

    @Autowired
    private ProveedorRetailRepository proveedorRetailRepository;

    @Autowired
    private ArticuloRepository articuloRepository;

    @Autowired
    private InventarioService inventarioService;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    @Autowired
    private PresentacionArticuloRepository presentacionArticuloRepository;

    @Autowired
    private LoteArticuloRepository loteArticuloRepository;

    public static class ItemCompraRetail {
        public Long articuloId;
        public BigDecimal cantidad;
        public BigDecimal costoUnitario;
        public String monedaCosto;
        public Long presentacionId;
        public LocalDate fechaVencimiento;
    }

    /**
     * @param montoPagadoAhora cuánto se le pagó al proveedor de una vez, en `monedaPago` — null/0 = factura entera
     *                         a crédito. Si es menor al total, la diferencia queda como cuenta por pagar (CXP).
     */
    @Transactional
    public CompraRetail registrarCompra(Long tenantId, Long proveedorId, String numeroFactura, List<ItemCompraRetail> items,
                                         BigDecimal montoPagadoAhora, String monedaPago) {
        if (items == null || items.isEmpty()) {
            throw new RuntimeException("La compra debe tener al menos un ítem");
        }

        ProveedorRetail proveedor = proveedorRetailRepository.findById(proveedorId)
            .orElseThrow(() -> new RuntimeException("Proveedor no encontrado"));
        if (!proveedor.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Proveedor no pertenece a este tenant");
        }

        CompraRetail compra = new CompraRetail();
        compra.setTenantId(tenantId);
        compra.setProveedor(proveedor);
        compra.setNumeroFactura(numeroFactura);
        compra.setFechaCompra(LocalDateTime.now());

        BigDecimal totalCompra = BigDecimal.ZERO;

        for (ItemCompraRetail item : items) {
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

            BigDecimal costoUnitarioEntrada = (item.monedaCosto != null && !item.monedaCosto.isBlank())
                ? motorFinancieroService.convertirAMonedaBase(tenantId, item.costoUnitario, item.monedaCosto)
                : item.costoUnitario;

            BigDecimal cantidadBase = item.cantidad;
            BigDecimal costoUnitarioBase = costoUnitarioEntrada;
            String detallePresentacion = "";
            if (item.presentacionId != null) {
                PresentacionArticulo presentacion = presentacionArticuloRepository.findById(item.presentacionId)
                    .orElseThrow(() -> new RuntimeException("Presentación no encontrada: " + item.presentacionId));
                if (!presentacion.getTenantId().equals(tenantId)) {
                    throw new RuntimeException("Violación de seguridad: Presentación no pertenece a este tenant");
                }
                if (!presentacion.getArticulo().getId().equals(articulo.getId())) {
                    throw new RuntimeException("La presentación no corresponde a este artículo");
                }
                cantidadBase = item.cantidad.multiply(presentacion.getUnidadesPorPresentacion());
                costoUnitarioBase = costoUnitarioEntrada.divide(presentacion.getUnidadesPorPresentacion(), 4, RoundingMode.HALF_UP);
                detallePresentacion = " (" + item.cantidad + " x " + presentacion.getNombre() + ")";
            }

            articulo.setCostoUnitario(costoUnitarioBase);
            articuloRepository.save(articulo);

            inventarioService.registrarMovimientoKardex(articulo.getId(), tenantId, Kardex.TipoOperacion.ENTRADA,
                cantidadBase, costoUnitarioBase, "Compra factura " + numeroFactura + " — Proveedor: " + proveedor.getNombre() + detallePresentacion);

            if (item.fechaVencimiento != null) {
                LoteArticulo lote = new LoteArticulo();
                lote.setTenantId(tenantId);
                lote.setArticulo(articulo);
                lote.setCantidadIngresada(cantidadBase);
                lote.setCantidadActual(cantidadBase);
                lote.setCostoUnitario(costoUnitarioBase);
                lote.setFechaVencimiento(item.fechaVencimiento);
                lote.setReferenciaCompra(numeroFactura);
                loteArticuloRepository.save(lote);
            }

            BigDecimal subtotal = item.cantidad.multiply(costoUnitarioEntrada);
            totalCompra = totalCompra.add(subtotal);

            DetalleCompraRetail detalle = new DetalleCompraRetail();
            detalle.setTenantId(tenantId);
            detalle.setArticulo(articulo);
            detalle.setCantidad(cantidadBase);
            detalle.setCostoUnitario(costoUnitarioBase);
            detalle.setSubtotal(subtotal);
            compra.addItem(detalle);
        }

        compra.setTotal(totalCompra);

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
        CompraRetail guardada = compraRetailRepository.save(compra);

        BigDecimal saldoPendiente = totalCompra.subtract(montoPagadoBase).setScale(2, RoundingMode.HALF_UP);
        if (saldoPendiente.compareTo(BigDecimal.ZERO) > 0) {
            motorFinancieroService.registrarMovimientoMultiMoneda(tenantId, MovimientoCaja.TipoMovimiento.CXP,
                saldoPendiente, null, null, "Compra de mercancía factura " + numeroFactura + " — Proveedor: " + proveedor.getNombre());
        }

        return guardada;
    }
}
