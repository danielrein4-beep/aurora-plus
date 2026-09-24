package com.auroraplus.modules.veterinaria.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.veterinaria.entities.CierreCajaVet;
import com.auroraplus.modules.veterinaria.services.CierreCajaVetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/veterinaria/cierres-caja")
public class CierreCajaVetController {

    @Autowired
    private CierreCajaVetService cierreCajaVetService;

    @GetMapping
    public List<CierreCajaVet> listarHistorial() {
        return cierreCajaVetService.listarHistorial();
    }

    @PostMapping
    public ResponseEntity<CierreCajaVet> registrarCierre(
            @RequestParam(required = false) Long tenantId,
            @RequestBody CierreCajaVet cierre) {
        com.auroraplus.core.auth.AuthContext.exigirRol("DUENO_ADMIN", "MEDICO", "RECEPCIONISTA", "CAJERO_VENDEDOR");
        Long tenantActivo = tenantId != null ? tenantId : TenantContext.getCurrentTenant();
        if (tenantActivo == null) {
            throw new RuntimeException("Tenant no identificado en la sesión");
        }
        return ResponseEntity.ok(cierreCajaVetService.registrarCierre(tenantActivo, cierre));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarCierre(@PathVariable Long id) {
        // Borrar un cierre de caja borra la evidencia de un descuadre: solo el dueño.
        com.auroraplus.core.auth.AuthContext.exigirRol("DUENO_ADMIN");
        cierreCajaVetService.eliminarCierre(id);
        return ResponseEntity.noContent().build();
    }
}
