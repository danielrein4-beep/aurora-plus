package com.auroraplus.modules.repuestos.controllers;

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
    }

    public static class CompraRequest {
        public Long proveedorId;
        public String numeroFactura;
        public List<ItemCompraRequest> items;
    }

    @GetMapping
    public List<CompraRepuesto> listar() {
        return compraRepuestoRepository.findAllByOrderByFechaCompraDesc();
    }

    @PostMapping
    public ResponseEntity<CompraRepuesto> registrar(@RequestParam Long tenantId, @RequestBody CompraRequest request) {
        List<RepuestoCompraService.ItemCompra> items = request.items.stream().map(i -> {
            RepuestoCompraService.ItemCompra item = new RepuestoCompraService.ItemCompra();
            item.repuestoId = i.repuestoId;
            item.cantidad = i.cantidad;
            item.costoUnitario = i.costoUnitario;
            return item;
        }).toList();

        CompraRepuesto compra = repuestoCompraService.registrarCompra(tenantId, request.proveedorId, request.numeroFactura, items);
        return ResponseEntity.ok(compra);
    }
}
