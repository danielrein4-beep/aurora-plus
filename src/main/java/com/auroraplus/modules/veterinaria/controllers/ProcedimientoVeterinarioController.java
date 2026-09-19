package com.auroraplus.modules.veterinaria.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.veterinaria.entities.ProcedimientoVeterinario;
import com.auroraplus.modules.veterinaria.services.ProcedimientoVeterinarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/veterinaria/procedimientos")
public class ProcedimientoVeterinarioController {

    @Autowired
    private ProcedimientoVeterinarioService procedimientoVeterinarioService;

    @GetMapping
    public List<ProcedimientoVeterinario> listar() {
        return procedimientoVeterinarioService.listar();
    }

    @PostMapping
    public ResponseEntity<ProcedimientoVeterinario> crear(
            @RequestParam(required = false) Long tenantId,
            @RequestBody ProcedimientoVeterinario proc) {
        Long tenantActivo = com.auroraplus.modules.veterinaria.services.VeterinariaTenantGuard.resolver(tenantId);
        if (tenantActivo == null) {
            throw new RuntimeException("Tenant no identificado en la sesión");
        }
        return ResponseEntity.ok(procedimientoVeterinarioService.crear(tenantActivo, proc));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        procedimientoVeterinarioService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
