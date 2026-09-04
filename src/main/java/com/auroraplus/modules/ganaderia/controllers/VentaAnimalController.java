package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.VentaAnimal;
import com.auroraplus.modules.ganaderia.repositories.VentaAnimalRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaVentaService;
import com.auroraplus.modules.ganaderia.services.VentaAnimalPdfService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/ganaderia/ventas")
public class VentaAnimalController {

    @Autowired
    private GanaderiaVentaService ganaderiaVentaService;

    @Autowired
    private VentaAnimalRepository ventaAnimalRepository;

    @Autowired
    private VentaAnimalPdfService ventaAnimalPdfService;

    public static class VentaRequest {
        public String numeroTicket;
        public String comprador;
        public List<GanaderiaVentaService.ItemVentaAnimal> items;
        public String monedaPago; // opcional, si el comprador paga en moneda distinta a la base del tenant
        public BigDecimal montoRecibido;
        public String claveIdempotencia; // opcional, ver IdempotenciaService
    }

    @GetMapping
    public List<VentaAnimal> listar() {
        return ventaAnimalRepository.findAllByOrderByFechaDesc();
    }

    @PostMapping
    public ResponseEntity<VentaAnimal> registrar(@RequestParam Long tenantId, @RequestBody VentaRequest request) {
        return ResponseEntity.ok(ganaderiaVentaService.registrarVenta(tenantId, request.numeroTicket, request.comprador,
            request.items, request.monedaPago, request.montoRecibido, request.claveIdempotencia));
    }

    @GetMapping(value = "/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> pdf(@PathVariable Long id) throws Exception {
        VentaAnimal venta = ventaAnimalRepository.findById(id).orElseThrow(() -> new RuntimeException("Venta no encontrada"));
        byte[] pdf = ventaAnimalPdfService.generarLiquidacionPdf(venta);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"liquidacion-" + venta.getNumeroTicket() + ".pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }
}
