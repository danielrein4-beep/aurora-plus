package com.auroraplus.modules.moda.controllers;

import com.auroraplus.modules.moda.entities.CompraModa;
import com.auroraplus.modules.moda.repositories.CompraModaRepository;
import com.auroraplus.modules.moda.services.ModaCompraService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/moda/compras")
public class CompraModaController {

    @Autowired
    private ModaCompraService modaCompraService;

    @Autowired
    private CompraModaRepository compraModaRepository;

    public static class ItemCompraRequest {
        public Long varianteId;
        public BigDecimal cantidad;
        public BigDecimal costoUnitario;
    }

    public static class CompraRequest {
        public Long proveedorId;
        public String numeroFactura;
        public List<ItemCompraRequest> items;
    }

    @GetMapping
    public List<CompraModa> listar() {
        return compraModaRepository.findAllByOrderByFechaCompraDesc();
    }

    @PostMapping
    public ResponseEntity<CompraModa> registrar(@RequestParam Long tenantId, @RequestBody CompraRequest request) {
        List<ModaCompraService.ItemCompra> items = new ArrayList<>();
        for (ItemCompraRequest itemReq : request.items) {
            ModaCompraService.ItemCompra item = new ModaCompraService.ItemCompra();
            item.varianteId = itemReq.varianteId;
            item.cantidad = itemReq.cantidad;
            item.costoUnitario = itemReq.costoUnitario;
            items.add(item);
        }
        return ResponseEntity.ok(modaCompraService.registrarCompra(tenantId, request.proveedorId, request.numeroFactura, items));
    }
}
