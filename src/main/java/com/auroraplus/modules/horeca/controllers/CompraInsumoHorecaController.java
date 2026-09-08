package com.auroraplus.modules.horeca.controllers;

import com.auroraplus.modules.horeca.entities.CompraInsumoHoreca;
import com.auroraplus.modules.horeca.repositories.CompraInsumoHorecaRepository;
import com.auroraplus.modules.horeca.services.CompraInsumoHorecaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
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
        public Long presentacionId;
        public LocalDate fechaVencimiento;
    }

    public static class CompraRequest {
        public Long proveedorId;
        public String numeroFactura;
        public List<ItemCompraRequest> items;
        public BigDecimal montoPagadoAhora; // opcional — null/0 = factura entera a crédito
        public String monedaPago;
    }

    // Sin tenantId acá, findAll() devolvía las compras de TODOS los tenants
    // mezcladas — mismo hallazgo que en el historial de cierres de caja.
    @GetMapping
    public List<CompraInsumoHoreca> listar(@RequestParam Long tenantId) {
        return compraInsumoHorecaRepository.findByTenantIdOrderByFechaCompraDesc(tenantId);
    }

    @PostMapping
    public ResponseEntity<CompraInsumoHoreca> registrar(@RequestParam Long tenantId, @RequestBody CompraRequest request) {
        List<CompraInsumoHorecaService.ItemCompraInsumo> items = new ArrayList<>();
        for (ItemCompraRequest itemReq : request.items) {
            CompraInsumoHorecaService.ItemCompraInsumo item = new CompraInsumoHorecaService.ItemCompraInsumo();
            item.articuloId = itemReq.articuloId;
            item.cantidad = itemReq.cantidad;
            item.costoUnitario = itemReq.costoUnitario;
            item.presentacionId = itemReq.presentacionId;
            item.fechaVencimiento = itemReq.fechaVencimiento;
            items.add(item);
        }
        return ResponseEntity.ok(compraInsumoHorecaService.registrarCompra(tenantId, request.proveedorId, request.numeroFactura, items,
            request.montoPagadoAhora, request.monedaPago));
    }
}
