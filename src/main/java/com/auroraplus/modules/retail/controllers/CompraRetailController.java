package com.auroraplus.modules.retail.controllers;

import com.auroraplus.modules.retail.entities.CompraRetail;
import com.auroraplus.modules.retail.repositories.CompraRetailRepository;
import com.auroraplus.modules.retail.services.RetailCompraService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/retail/compras")
public class CompraRetailController {

    @Autowired
    private RetailCompraService retailCompraService;

    @Autowired
    private CompraRetailRepository compraRetailRepository;

    public static class ItemCompraRequest {
        public Long articuloId;
        public BigDecimal cantidad;
        public BigDecimal costoUnitario;
        public String monedaCosto;
        public Long presentacionId;
        public LocalDate fechaVencimiento;
    }

    public static class CompraRequest {
        public Long proveedorId;
        public String numeroFactura;
        public List<ItemCompraRequest> items;
        public BigDecimal montoPagadoAhora;
        public String monedaPago;
    }

    @GetMapping
    public List<CompraRetail> listar(@RequestParam Long tenantId) {
        return compraRetailRepository.findByTenantIdOrderByFechaCompraDesc(tenantId);
    }

    @PostMapping
    public ResponseEntity<CompraRetail> registrar(@RequestParam Long tenantId, @RequestBody CompraRequest request) {
        List<RetailCompraService.ItemCompraRetail> items = new ArrayList<>();
        for (ItemCompraRequest itemReq : request.items) {
            RetailCompraService.ItemCompraRetail item = new RetailCompraService.ItemCompraRetail();
            item.articuloId = itemReq.articuloId;
            item.cantidad = itemReq.cantidad;
            item.costoUnitario = itemReq.costoUnitario;
            item.monedaCosto = itemReq.monedaCosto;
            item.presentacionId = itemReq.presentacionId;
            item.fechaVencimiento = itemReq.fechaVencimiento;
            items.add(item);
        }
        return ResponseEntity.ok(retailCompraService.registrarCompra(tenantId, request.proveedorId, request.numeroFactura, items,
            request.montoPagadoAhora, request.monedaPago));
    }
}
