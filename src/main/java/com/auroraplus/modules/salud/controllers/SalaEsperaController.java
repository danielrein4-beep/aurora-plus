package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.entities.SalaEspera;
import com.auroraplus.modules.salud.services.MedicoTenantResolver;
import com.auroraplus.modules.salud.services.SalaEsperaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/salud/sala-espera")
public class SalaEsperaController {

    @Autowired
    private SalaEsperaService salaEsperaService;

    @Autowired
    private MedicoTenantResolver medicoTenantResolver;

    @GetMapping
    public List<SalaEspera> listarColaActiva() {
        return salaEsperaService.listarColaActiva();
    }

    @PostMapping("/check-in")
    public ResponseEntity<SalaEspera> checkIn(@RequestParam(required = false) Long tenantId, @RequestBody SalaEspera entrada) {
        Long tenantActivo = tenantId != null ? tenantId : TenantContext.getCurrentTenant();
        // Un solo médico por tenant: se sabe desde el check-in quién atiende, no hace
        // falta esperar a "llamar" para asignarlo (ver MedicoTenantResolver).
        if (entrada.getMedicoId() == null) {
            medicoTenantResolver.resolverMedicoDelTenant(tenantActivo).ifPresent(m -> {
                entrada.setMedicoId(m.id);
                entrada.setMedicoNombre(m.nombre);
            });
        }
        return ResponseEntity.ok(salaEsperaService.checkIn(tenantActivo, entrada));
    }

    @PostMapping("/{id}/llamar")
    public ResponseEntity<SalaEspera> llamarAConsultorio(@PathVariable Long id, @RequestParam(required = false) String consultorio,
                                                          @RequestParam(required = false) Long medicoId,
                                                          @RequestParam(required = false) String medicoNombre) {
        return ResponseEntity.ok(salaEsperaService.llamarAConsultorio(id, consultorio, medicoId, medicoNombre));
    }

    @PostMapping("/{id}/finalizar")
    public ResponseEntity<SalaEspera> finalizarAtencion(@PathVariable Long id) {
        return ResponseEntity.ok(salaEsperaService.finalizarAtencion(id));
    }
}
