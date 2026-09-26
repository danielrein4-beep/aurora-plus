package com.auroraplus.modules.repuestos.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
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
    public List<PresentacionRepuesto> listarPorRepuesto(@PathVariable Long repuestoId) {
        Long tenantId = TenantContext.getCurrentTenant();
        return presentacionRepuestoRepository.findByRepuestoIdAndTenantId(repuestoId, tenantId);
    }

    @PostMapping
    public ResponseEntity<PresentacionRepuesto> registrar(
            @RequestParam Long repuestoId,
            @RequestParam String nombrePresentacion, @RequestParam BigDecimal factorConversion,
            @RequestParam BigDecimal precioVenta) {
        Long tenantId = TenantContext.getCurrentTenant();
        AuthContext.exigirRol("DUENO_ADMIN", "ENCARGADO_INVENTARIO");
        PresentacionRepuesto presentacion = repuestoConversionService.registrarPresentacion(
            repuestoId, tenantId, nombrePresentacion, factorConversion, precioVenta);
        return ResponseEntity.ok(presentacion);
    }

    @PostMapping("/{presentacionId}/despachar")
    public ResponseEntity<BigDecimal> despachar(@PathVariable Long presentacionId,
                                                 @RequestParam BigDecimal cantidad,
                                                 @RequestParam(required = false) String monedaPago,
                                                 @RequestParam(required = false) BigDecimal montoRecibido,
                                                 @RequestParam(required = false) String claveIdempotencia,
                                                 @RequestParam(required = false) Long clienteId) {
        Long tenantId = TenantContext.getCurrentTenant();
        BigDecimal total = repuestoConversionService.despacharPorPresentacion(presentacionId, tenantId, cantidad, monedaPago, montoRecibido, claveIdempotencia, clienteId);
        return ResponseEntity.ok(total);
    }
}
