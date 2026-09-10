package com.auroraplus.modules.retail.services;

import com.auroraplus.core.crm.entities.Cliente;
import com.auroraplus.core.crm.services.ClienteService;
import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.core.inventario.entities.CruceRepuesto;
import com.auroraplus.core.inventario.entities.Kardex;
import com.auroraplus.core.inventario.entities.PresentacionArticulo;
import com.auroraplus.core.inventario.repositories.ArticuloRepository;
import com.auroraplus.core.inventario.repositories.CruceRepuestoRepository;
import com.auroraplus.core.inventario.repositories.PresentacionArticuloRepository;
import com.auroraplus.core.inventario.services.InventarioService;
import com.auroraplus.modules.retail.entities.ItemVentaRetail;
import com.auroraplus.modules.retail.entities.VentaRetail;
import com.auroraplus.modules.retail.repositories.ItemVentaRetailRepository;
import com.auroraplus.modules.retail.repositories.VentaRetailRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Venta de mostrador de Aurora Retail — POS: escanear/buscar, armar el
 * carrito y cobrar en una sola transacción. Reutiliza el mismo núcleo que
 * Horeca: InventarioService.registrarMovimientoKardex (que ya aplica FEFO
 * automáticamente en cualquier salida, sin flag ni lógica extra para
 * Farmacia) y MotorFinancieroService (caja multi-moneda, CXC para "fiado").
 */
@Service
public class RetailVentaService {

    @Autowired
    private ArticuloRepository articuloRepository;

    @Autowired
    private PresentacionArticuloRepository presentacionArticuloRepository;

    @Autowired
    private CruceRepuestoRepository cruceRepuestoRepository;

    @Autowired
    private InventarioService inventarioService;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    @Autowired
    private ClienteService clienteService;

    @Autowired
    private VentaRetailRepository ventaRetailRepository;

    @Autowired
    private ItemVentaRetailRepository itemVentaRetailRepository;

    /**
     * Búsqueda unificada del POS: primero código de barras exacto (lectura de
     * scanner), si no hay match se busca por nombre/SKU/principio activo
     * (Farmacia), y por último por código OEM en el catálogo de cruce
     * (Repuestos) — buscar por OEM en un tenant que no es de repuestos
     * simplemente no encuentra nada, no hace falta filtrar por vertical acá.
     */
    public List<Articulo> buscarArticulos(Long tenantId, String texto) {
        if (texto == null || texto.isBlank()) return List.of();
        String q = texto.trim();

        return articuloRepository.findByCodigoBarrasAndTenantId(q, tenantId)
            .map(List::of)
            .orElseGet(() -> {
                List<Articulo> porNombre = articuloRepository.buscarPorNombreSkuOPrincipioActivo(tenantId, q);
                if (!porNombre.isEmpty()) return porNombre;

                List<CruceRepuesto> cruces = cruceRepuestoRepository.buscarPorCodigoOem(tenantId, q);
                Set<Articulo> porOem = new LinkedHashSet<>();
                for (CruceRepuesto c : cruces) porOem.add(c.getArticulo());
                return new ArrayList<>(porOem);
            });
    }

    public static class ItemVentaRequest {
        public Long articuloId;
        // Cantidad en la unidad en la que se vendió: si presentacionId viene
        // null, es la unidad base del artículo (admite decimales — venta
        // fraccionada de Ferretería, ej. 1.5 metros); si presentacionId viene,
        // es cantidad de presentaciones (ej. 2 cajas cerradas).
        public BigDecimal cantidad;
        public Long presentacionId;
    }

    public static class VentaRequest {
        public Long clienteId;
        public List<ItemVentaRequest> items;
        // Si esCredito=true, la venta queda como cuenta por cobrar (CXC) en
        // vez de cobrarse de una — "fiado" (lo que pide Ferretería).
        public boolean esCredito;
        public String metodoPago;
        public String monedaPago; // null = moneda base del tenant
        public BigDecimal montoRecibido; // solo si monedaPago != moneda base
    }

    @Transactional
    public VentaRetail registrarVenta(Long tenantId, VentaRequest request) {
        if (request.items == null || request.items.isEmpty()) {
            throw new RuntimeException("La venta debe tener al menos un ítem");
        }

        Cliente cliente = null;
        if (request.clienteId != null) {
            cliente = clienteService.obtener(request.clienteId, tenantId);
        }
        if (request.esCredito && cliente == null) {
            throw new RuntimeException("Una venta a crédito (fiado) necesita un cliente asociado");
        }

        VentaRetail venta = new VentaRetail();
        venta.setTenantId(tenantId);
        venta.setCliente(cliente);
        venta.setEsCredito(request.esCredito);
        venta.setMoneda(motorFinancieroService.obtenerMonedaBase(tenantId));

        BigDecimal totalVenta = BigDecimal.ZERO;
        List<ItemVentaRetail> items = new ArrayList<>();

        for (ItemVentaRequest itemReq : request.items) {
            if (itemReq.cantidad == null || itemReq.cantidad.compareTo(BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("La cantidad debe ser mayor a cero");
            }
            Articulo articulo = articuloRepository.findById(itemReq.articuloId)
                .orElseThrow(() -> new RuntimeException("Artículo no encontrado: " + itemReq.articuloId));
            if (!articulo.getTenantId().equals(tenantId)) {
                throw new RuntimeException("Violación de seguridad: Artículo no pertenece a este tenant");
            }

            BigDecimal cantidadBase;
            BigDecimal precioUnitarioBase;
            PresentacionArticulo presentacion = null;
            if (itemReq.presentacionId != null) {
                presentacion = presentacionArticuloRepository.findById(itemReq.presentacionId)
                    .orElseThrow(() -> new RuntimeException("Presentación no encontrada: " + itemReq.presentacionId));
                if (!presentacion.getTenantId().equals(tenantId)) {
                    throw new RuntimeException("Violación de seguridad: Presentación no pertenece a este tenant");
                }
                if (!presentacion.getArticulo().getId().equals(articulo.getId())) {
                    throw new RuntimeException("La presentación no corresponde a este artículo");
                }
                cantidadBase = itemReq.cantidad.multiply(presentacion.getUnidadesPorPresentacion());
                precioUnitarioBase = presentacion.getPrecioVentaEfectivo().divide(presentacion.getUnidadesPorPresentacion(), 4, RoundingMode.HALF_UP);
            } else {
                cantidadBase = itemReq.cantidad;
                precioUnitarioBase = articulo.getPrecioVenta();
            }

            // Descuenta stock ANTES de aceptar el ítem — si no alcanza, revienta
            // acá (InventarioService) y la transacción entera se revierte. Esto
            // ya aplica FEFO automáticamente (descuenta primero el lote más
            // próximo a vencer), sin ningún flag especial para Farmacia.
            inventarioService.registrarMovimientoKardex(articulo.getId(), tenantId, Kardex.TipoOperacion.SALIDA,
                cantidadBase, articulo.getCostoUnitario(), "Venta mostrador: " + articulo.getNombre());

            BigDecimal subtotal = precioUnitarioBase.multiply(cantidadBase).setScale(2, RoundingMode.HALF_UP);
            totalVenta = totalVenta.add(subtotal);

            ItemVentaRetail item = new ItemVentaRetail();
            item.setTenantId(tenantId);
            item.setVenta(venta);
            item.setArticulo(articulo);
            item.setPresentacion(presentacion);
            item.setCantidad(cantidadBase);
            item.setPrecioUnitario(precioUnitarioBase);
            item.setCostoUnitario(articulo.getCostoUnitario());
            items.add(item);
        }

        venta.setTotal(totalVenta);
        VentaRetail guardada = ventaRetailRepository.save(venta);
        for (ItemVentaRetail item : items) {
            item.setVenta(guardada);
        }
        itemVentaRetailRepository.saveAll(items);

        if (request.esCredito) {
            motorFinancieroService.registrarMovimientoMultiMoneda(tenantId, MovimientoCaja.TipoMovimiento.CXC,
                totalVenta, null, null, "Venta a crédito — Cliente: " + cliente.getNombre());
        } else {
            motorFinancieroService.registrarMovimientoMultiMoneda(tenantId, MovimientoCaja.TipoMovimiento.INGRESO,
                totalVenta, request.monedaPago, request.montoRecibido, "Venta de mostrador"
                    + (cliente != null ? " — Cliente: " + cliente.getNombre() : ""));
        }

        return guardada;
    }
}
