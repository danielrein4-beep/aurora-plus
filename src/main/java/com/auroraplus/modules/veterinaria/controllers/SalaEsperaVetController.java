package com.auroraplus.modules.veterinaria.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.veterinaria.entities.SalaEsperaVet;
import com.auroraplus.modules.veterinaria.services.SalaEsperaVetService;
import com.auroraplus.modules.veterinaria.services.VeterinarioTenantResolver;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/veterinaria/sala-espera")
public class SalaEsperaVetController {

    @Autowired
    private SalaEsperaVetService salaEsperaVetService;

    @Autowired
    private VeterinarioTenantResolver veterinarioTenantResolver;

    @GetMapping
    public List<SalaEsperaVet> listarColaActiva() {
        return salaEsperaVetService.listarColaActiva();
    }

    @PostMapping("/check-in")
    public ResponseEntity<SalaEsperaVet> checkIn(@RequestParam(required = false) Long tenantId, @RequestBody SalaEsperaVet entrada) {
        Long tenantActivo = com.auroraplus.modules.veterinaria.services.VeterinariaTenantGuard.resolver(tenantId);
        if (entrada.getVeterinarioId() == null) {
            veterinarioTenantResolver.resolverVeterinarioDelTenant(tenantActivo).ifPresent(v -> {
                entrada.setVeterinarioId(v.id);
                entrada.setVeterinarioNombre(v.nombre);
            });
        }
        return ResponseEntity.ok(salaEsperaVetService.checkIn(tenantActivo, entrada));
    }

    @PostMapping("/{id}/llamar")
    public ResponseEntity<SalaEsperaVet> llamarAConsultorio(
            @PathVariable Long id,
            @RequestParam(required = false) String consultorio,
            @RequestParam(required = false) Long veterinarioId,
            @RequestParam(required = false) String veterinarioNombre) {
        return ResponseEntity.ok(salaEsperaVetService.llamarAConsultorio(id, consultorio, veterinarioId, veterinarioNombre));
    }

    @PostMapping("/{id}/finalizar")
    public ResponseEntity<SalaEsperaVet> finalizarAtencion(@PathVariable Long id) {
        return ResponseEntity.ok(salaEsperaVetService.finalizarAtencion(id));
    }
}
