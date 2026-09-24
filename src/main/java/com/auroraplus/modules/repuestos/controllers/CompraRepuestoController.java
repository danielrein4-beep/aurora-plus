package com.auroraplus.modules.repuestos.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.repuestos.entities.CompraRepuesto;
import com.auroraplus.modules.repuestos.repositories.CompraRepuestoRepository;
import com.auroraplus.modules.repuestos.services.RepuestoCompraService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Registro de facturas de compra a proveedores: sube stock, actualiza costo,
 * y deja rastro en el Kárdex — el flujo que le faltaba al módulo para operar
 * como una ferretería/tienda de repuestos real.
 */
@RestController
@RequestMapping("/api/repuestos/compras")
public class CompraRepuestoController {

    @Autowired
    private RepuestoCompraService repuestoCompraService;

    @Autowired
    private CompraRepuestoRepository compraRepuestoRepository;

    public static class ItemCompraRequest {
        public Long repuestoId;
        public java.math.BigDecimal cantidad;
        public java.math.BigDecimal costoUnitario;
        public java.math.BigDecimal precioVenta;
    }

    public static class CompraRequest {
        public Long proveedorId;
        public String numeroFactura;
        public List<ItemCompraRequest> items;
        public java.math.BigDecimal montoPagadoAhora;
        public String monedaPago;
        public Integer diasCredito;
        // Datos de la factura fiscal del proveedor para el libro de compras (opcionales).
        public String numeroControl;
        public java.math.BigDecimal montoExento;
        public java.math.BigDecimal baseImponible;
        public java.math.BigDecimal alicuotaIva;
        public java.math.BigDecimal montoIva;
        public java.math.BigDecimal ivaRetenido;
    }

    @GetMapping
    public List<CompraRepuesto> listar() {
        return compraRepuestoRepository.listarConProveedor(TenantContext.getCurrentTenant());
    }

    @Autowired
    private com.auroraplus.modules.comercio.services.LibroFiscalService libroFiscalService;

    private static boolean tieneDatosFiscales(CompraRequest r) {
        return (r.numeroControl != null && !r.numeroControl.isBlank()) || r.baseImponible != null || r.montoIva != null
            || r.montoExento != null || r.ivaRetenido != null;
    }

    @PostMapping
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<CompraRepuesto> registrar(@RequestParam Long tenantId, @RequestBody CompraRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN", "ENCARGADO_INVENTARIO");
        List<RepuestoCompraService.ItemCompra> items = request.items.stream().map(i -> {
            RepuestoCompraService.ItemCompra item = new RepuestoCompraService.ItemCompra();
            item.repuestoId = i.repuestoId;
            item.cantidad = i.cantidad;
            item.costoUnitario = i.costoUnitario;
            item.precioVenta = i.precioVenta;
            return item;
        }).toList();

        CompraRepuesto compra = repuestoCompraService.registrarCompra(tenantId, request.proveedorId, request.numeroFactura, items,
            request.montoPagadoAhora, request.monedaPago, request.diasCredito);
        if (tieneDatosFiscales(request)) {
            compra.setNumeroControl(request.numeroControl != null && !request.numeroControl.isBlank() ? request.numeroControl.trim() : null);
            compra.setMontoExento(request.montoExento);
            compra.setBaseImponible(request.baseImponible);
            compra.setAlicuotaIva(request.alicuotaIva);
            compra.setMontoIva(request.montoIva);
            compra.setIvaRetenido(request.ivaRetenido);
            compra.setTasaBcv(libroFiscalService.tasaBcvVigente(tenantId, compra.getFechaCompra()));
            compra = compraRepuestoRepository.save(compra);
        }
        return ResponseEntity.ok(compra);
    }
}
