package com.auroraplus.modules.repuestos.controllers;

import com.auroraplus.modules.repuestos.entities.PresentacionRepuesto;
import com.auroraplus.modules.repuestos.repositories.PresentacionRepuestoRepository;
import com.auroraplus.modules.repuestos.services.RepuestoConversionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Presentaciones de venta fraccionadas (caja, unidad, metro, kilo — Subfase
 * 5.2) y su despacho contra el inventario en unidad base.
 */
@RestController
@RequestMapping("/api/repuestos/presentaciones")
public class PresentacionRepuestoController {

    @Autowired
    private RepuestoConversionService repuestoConversionService;

    @Autowired
    private PresentacionRepuestoRepository presentacionRepuestoRepository;

    @GetMapping("/repuesto/{repuestoId}")
    public List<PresentacionRepuesto> listarPorRepuesto(@PathVariable Long repuestoId, @RequestParam Long tenantId) {
        return presentacionRepuestoRepository.findByRepuestoIdAndTenantId(repuestoId, tenantId);
    }

    @PostMapping
    public ResponseEntity<PresentacionRepuesto> registrar(
            @RequestParam Long repuestoId, @RequestParam Long tenantId,
            @RequestParam String nombrePresentacion, @RequestParam BigDecimal factorConversion,
            @RequestParam BigDecimal precioVenta) {
        PresentacionRepuesto presentacion = repuestoConversionService.registrarPresentacion(
            repuestoId, tenantId, nombrePresentacion, factorConversion, precioVenta);
        return ResponseEntity.ok(presentacion);
    }

    @PostMapping("/{presentacionId}/despachar")
    public ResponseEntity<BigDecimal> despachar(@PathVariable Long presentacionId, @RequestParam Long tenantId,
                                                 @RequestParam BigDecimal cantidad,
                                                 @RequestParam(required = false) String monedaPago,
                                                 @RequestParam(required = false) BigDecimal montoRecibido,
                                                 @RequestParam(required = false) String claveIdempotencia) {
        BigDecimal total = repuestoConversionService.despacharPorPresentacion(presentacionId, tenantId, cantidad, monedaPago, montoRecibido, claveIdempotencia);
        return ResponseEntity.ok(total);
    }
}
