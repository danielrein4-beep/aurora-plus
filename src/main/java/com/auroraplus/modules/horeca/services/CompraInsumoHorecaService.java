package com.auroraplus.modules.horeca.services;

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
import com.auroraplus.modules.horeca.entities.CompraInsumoHoreca;
import com.auroraplus.modules.horeca.entities.DetalleCompraInsumoHoreca;
import com.auroraplus.modules.horeca.entities.ProveedorHoreca;
import com.auroraplus.modules.horeca.repositories.CompraInsumoHorecaRepository;
import com.auroraplus.modules.horeca.repositories.ProveedorHorecaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
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

    @Autowired
    private PresentacionArticuloRepository presentacionArticuloRepository;

    @Autowired
    private LoteArticuloRepository loteArticuloRepository;

    public static class ItemCompraInsumo {
        public Long articuloId;
        public BigDecimal cantidad;
        public BigDecimal costoUnitario;
        // Moneda en la que se escribió costoUnitario (ej. proveedor colombiano que
        // cobra en COP). Null/vacío = ya viene en la moneda base del tenant. Sin
        // esto, un costo tecleado en pesos se guardaba tal cual como si fuera
        // dólares — un insumo de 2500 COP (~$0.60) quedaba costando "$2500" y
        // reventaba el Valor Total en Inventario.
        public String monedaCosto;
        // Opcional: si se compra por presentación (six-pack, bolsa x30, caja x24)
        // en vez de la unidad base del artículo. "cantidad" y "costoUnitario" se
        // siguen llenando en la unidad de la presentación (ej. 10 six-packs a $3
        // el six-pack) — la conversión a unidad base se hace internamente.
        public Long presentacionId;
        // Opcional: si el artículo es perecedero, crea un LoteArticulo para poder
        // avisar cuándo esté por vencer.
        public LocalDate fechaVencimiento;
    }

    @Transactional
    public CompraInsumoHoreca registrarCompra(Long tenantId, Long proveedorId, String numeroFactura, List<ItemCompraInsumo> items) {
        return registrarCompra(tenantId, proveedorId, numeroFactura, items, null, null);
    }

    /**
     * @param montoPagadoAhora cuánto se le pagó al proveedor de una vez, en `monedaPago` — null/0 = factura entera
     *                         a crédito. Si es menor al total, la diferencia queda como cuenta por pagar (CXP)
     *                         normal; si cubre el total, no se crea CXP alguna (factura saldada de una).
     */
    @Transactional
    public CompraInsumoHoreca registrarCompra(Long tenantId, Long proveedorId, String numeroFactura, List<ItemCompraInsumo> items,
                                               BigDecimal montoPagadoAhora, String monedaPago) {
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

            // Si el costo se escribió en otra moneda (ej. proveedor que cobra en
            // pesos colombianos), se convierte a la moneda base del tenant ANTES
            // de cualquier otro cálculo — todo el resto del sistema (Valor Total en
            // Inventario, margen, costeo de recetas) asume que costoUnitario del
            // artículo siempre está en la moneda base.
            BigDecimal costoUnitarioEntrada = (item.monedaCosto != null && !item.monedaCosto.isBlank())
                ? motorFinancieroService.convertirAMonedaBase(tenantId, item.costoUnitario, item.monedaCosto)
                : item.costoUnitario;

            // Si se compró por presentación (six-pack, bolsa x30, etc.), se convierte
            // a la unidad base del artículo — el stock y el costeo de recetas siempre
            // se llevan en unidad base, la presentación es solo cómo llegó la mercancía.
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

            // El costo vigente se actualiza al último precio de compra — es lo que
            // alimenta el costeo dinámico de las recetas (EscandalloService.recalcularCosto).
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

            DetalleCompraInsumoHoreca detalle = new DetalleCompraInsumoHoreca();
            detalle.setTenantId(tenantId);
            detalle.setArticulo(articulo);
            detalle.setCantidad(cantidadBase);
            detalle.setCostoUnitario(costoUnitarioBase);
            detalle.setSubtotal(subtotal);
            compra.addItem(detalle);
        }

        compra.setTotal(totalCompra);

        // Si se pagó algo de una vez, sale de caja como EGRESO real (en la moneda
        // en la que físicamente se entregó) y solo la diferencia (si queda) se
        // registra como deuda — antes SIEMPRE se cargaba el total entero a la
        // cuenta por pagar, aunque el empleado hubiera pagado todo en efectivo.
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
        CompraInsumoHoreca guardada = compraInsumoHorecaRepository.save(compra);

        BigDecimal saldoPendiente = totalCompra.subtract(montoPagadoBase).setScale(2, RoundingMode.HALF_UP);
        if (saldoPendiente.compareTo(BigDecimal.ZERO) > 0) {
            motorFinancieroService.registrarMovimientoMultiMoneda(tenantId, MovimientoCaja.TipoMovimiento.CXP,
                saldoPendiente, null, null, "Compra de insumos factura " + numeroFactura + " — Proveedor: " + proveedor.getNombre());
        }

        return guardada;
    }
}
