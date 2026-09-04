package com.auroraplus.modules.horeca.controllers;

import com.auroraplus.modules.horeca.entities.CompraInsumoHoreca;
import com.auroraplus.modules.horeca.repositories.CompraInsumoHorecaRepository;
import com.auroraplus.modules.horeca.services.CompraInsumoHorecaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/horeca/compras-insumo")
public class CompraInsumoHorecaController {

    @Autowired
    private CompraInsumoHorecaService compraInsumoHorecaService;

    @Autowired
    private CompraInsumoHorecaRepository compraInsumoHorecaRepository;

    public static class ItemCompraRequest {
        public Long articuloId;
        public BigDecimal cantidad;
        public BigDecimal costoUnitario;
    }

    public static class CompraRequest {
        public Long proveedorId;
        public String numeroFactura;
        public List<ItemCompraRequest> items;
    }

    @GetMapping
    public List<CompraInsumoHoreca> listar() {
        return compraInsumoHorecaRepository.findAllByOrderByFechaCompraDesc();
    }

    @PostMapping
    public ResponseEntity<CompraInsumoHoreca> registrar(@RequestParam Long tenantId, @RequestBody CompraRequest request) {
        List<CompraInsumoHorecaService.ItemCompraInsumo> items = new ArrayList<>();
        for (ItemCompraRequest itemReq : request.items) {
            CompraInsumoHorecaService.ItemCompraInsumo item = new CompraInsumoHorecaService.ItemCompraInsumo();
            item.articuloId = itemReq.articuloId;
            item.cantidad = itemReq.cantidad;
            item.costoUnitario = itemReq.costoUnitario;
            items.add(item);
        }
        return ResponseEntity.ok(compraInsumoHorecaService.registrarCompra(tenantId, request.proveedorId, request.numeroFactura, items));
    }
}
