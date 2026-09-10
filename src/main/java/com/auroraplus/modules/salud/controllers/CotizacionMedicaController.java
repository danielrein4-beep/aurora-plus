package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.entities.CotizacionMedica;
import com.auroraplus.modules.salud.services.CotizacionMedicaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/salud/cotizaciones")
public class CotizacionMedicaController {

    @Autowired
    private CotizacionMedicaService cotizacionMedicaService;

    @GetMapping
    public List<CotizacionMedica> listar() {
        return cotizacionMedicaService.listar();
    }

    @PostMapping
    public ResponseEntity<CotizacionMedica> crear(
            @RequestParam(required = false) Long tenantId,
            @RequestBody CotizacionMedica cotizacion) {
        Long tenantActivo = tenantId != null ? tenantId : TenantContext.getCurrentTenant();
        if (tenantActivo == null) {
            throw new RuntimeException("Tenant no identificado en la sesión");
        }
        return ResponseEntity.ok(cotizacionMedicaService.crear(tenantActivo, cotizacion));
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<CotizacionMedica> actualizarEstado(
            @PathVariable Long id,
            @RequestParam CotizacionMedica.EstadoCotizacion estado) {
        return ResponseEntity.ok(cotizacionMedicaService.actualizarEstado(id, estado));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        cotizacionMedicaService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
