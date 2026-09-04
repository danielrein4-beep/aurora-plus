package com.auroraplus.modules.moda.controllers;

import com.auroraplus.modules.moda.entities.MovimientoModa;
import com.auroraplus.modules.moda.entities.VentaModa;
import com.auroraplus.modules.moda.repositories.MovimientoModaRepository;
import com.auroraplus.modules.moda.repositories.VentaModaRepository;
import com.auroraplus.modules.moda.services.ModaVentaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/moda/ventas")
public class VentaModaController {

    @Autowired
    private ModaVentaService modaVentaService;

    @Autowired
    private VentaModaRepository ventaModaRepository;

    @Autowired
    private MovimientoModaRepository movimientoModaRepository;

    public static class ItemVentaRequest {
        public Long varianteId;
        public BigDecimal cantidad;
    }

    public static class VentaRequest {
        public String numeroTicket;
        public Long clienteId;
        public String metodoPago; // EFECTIVO, GIFT_CARD
        public String codigoGiftCard;
        public List<ItemVentaRequest> items;
        public String monedaPago; // opcional, solo si EFECTIVO en moneda distinta a la base del tenant
        public BigDecimal montoRecibido;
        public String claveIdempotencia; // opcional, ver IdempotenciaService
    }

    @GetMapping
    public List<VentaModa> listar() {
        return ventaModaRepository.findAllByOrderByFechaDesc();
    }

    @PostMapping
    public ResponseEntity<VentaModa> registrar(@RequestParam Long tenantId, @RequestBody VentaRequest request) {
        List<ModaVentaService.ItemVenta> items = new ArrayList<>();
        for (ItemVentaRequest itemReq : request.items) {
            ModaVentaService.ItemVenta item = new ModaVentaService.ItemVenta();
            item.varianteId = itemReq.varianteId;
            item.cantidad = itemReq.cantidad;
            items.add(item);
        }
        return ResponseEntity.ok(modaVentaService.registrarVenta(tenantId, request.numeroTicket, request.clienteId,
            request.metodoPago, request.codigoGiftCard, items, request.monedaPago, request.montoRecibido,
            request.claveIdempotencia));
    }

    @GetMapping("/kardex/{varianteId}")
    public List<MovimientoModa> kardex(@PathVariable Long varianteId) {
        return movimientoModaRepository.findByVarianteIdOrderByFechaRegistroDesc(varianteId);
    }
}
