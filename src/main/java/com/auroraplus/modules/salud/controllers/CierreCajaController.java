package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.entities.CierreCaja;
import com.auroraplus.modules.salud.services.CierreCajaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Historial de cierres de caja auditados — antes solo vivía en localStorage del navegador
 * (se perdía al cambiar de PC o de navegador). Ver CierreCaja para el porqué.
 */
@RestController
@RequestMapping("/api/salud/cierres-caja")
public class CierreCajaController {

    @Autowired
    private CierreCajaService cierreCajaService;

    @GetMapping
    public List<CierreCaja> listarHistorial() {
        return cierreCajaService.listarHistorial();
    }

    @PostMapping
    public ResponseEntity<CierreCaja> registrarCierre(
            @RequestParam(required = false) Long tenantId,
            @RequestBody CierreCaja cierre) {
        Long tenantActivo = tenantId != null ? tenantId : TenantContext.getCurrentTenant();
        if (tenantActivo == null) {
            throw new RuntimeException("Tenant no identificado en la sesión");
        }
        return ResponseEntity.ok(cierreCajaService.registrarCierre(tenantActivo, cierre));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarCierre(@PathVariable Long id) {
        cierreCajaService.eliminarCierre(id);
        return ResponseEntity.noContent().build();
    }
}
