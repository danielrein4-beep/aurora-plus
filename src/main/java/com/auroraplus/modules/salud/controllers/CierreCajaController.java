package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
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

    @Autowired
    private RegistroAuditoriaService auditoriaService;

    @GetMapping
    public List<CierreCaja> listarHistorial() {
        return cierreCajaService.listarHistorial(TenantContext.getCurrentTenant());
    }

    @PostMapping
    public ResponseEntity<CierreCaja> registrarCierre(
            @RequestBody CierreCaja cierre) {
        AuthContext.exigirRol("DUENO_ADMIN", "MEDICO");
        Long tenantActivo = TenantContext.getCurrentTenant();
        if (tenantActivo == null) {
            throw new RuntimeException("Tenant no identificado en la sesión");
        }
        CierreCaja guardado = cierreCajaService.registrarCierre(tenantActivo, cierre);
        auditoriaService.registrar(tenantActivo, "SALUD", "CREAR", "CierreCaja", guardado.getId(), "Registró un cierre de caja");
        return ResponseEntity.ok(guardado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarCierre(@PathVariable Long id) {
        // Borrar un cierre de caja borra la evidencia de un descuadre: solo el dueño.
        AuthContext.exigirRol("DUENO_ADMIN");
        Long tenantId = TenantContext.getCurrentTenant();
        cierreCajaService.eliminarCierre(tenantId, id);
        auditoriaService.registrar(tenantId, "SALUD", "ELIMINAR", "CierreCaja", id, "Eliminó un cierre de caja");
        return ResponseEntity.noContent().build();
    }
}
