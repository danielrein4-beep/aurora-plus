package com.auroraplus.modules.salud.laboratorio.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.laboratorio.entities.ExamenRecibidoPaciente;
import com.auroraplus.modules.salud.laboratorio.services.PortalLaboratorioPacienteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Inbox del doctor: exámenes que los pacientes subieron desde el portal
 * público (ver PortalPacienteLaboratorioController). Reemplaza el
 * inbox viejo basado en OrdenLaboratorio.
 */
@RestController
@RequestMapping("/api/salud/laboratorio/inbox")
public class InboxExamenesRecibidosController {

    @Autowired
    private PortalLaboratorioPacienteService portalService;

    @GetMapping
    public List<ExamenRecibidoPaciente> listar() {
        return portalService.listarInbox(TenantContext.getCurrentTenant());
    }

    @GetMapping("/contador")
    public Map<String, Long> contador() {
        return Map.of("pendientes", portalService.contarNoLeidos(TenantContext.getCurrentTenant()));
    }

    @GetMapping("/paciente/{pacienteId}")
    public List<ExamenRecibidoPaciente> listarPorPaciente(@PathVariable Long pacienteId) {
        return portalService.listarPorPaciente(TenantContext.getCurrentTenant(), pacienteId);
    }

    @PostMapping("/{id}/marcar-leido")
    public ResponseEntity<ExamenRecibidoPaciente> marcarLeido(@PathVariable Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
        String usuario = AuthContext.getUsername();
        return ResponseEntity.ok(portalService.marcarLeido(tenantId, id, usuario));
    }

    public static class VincularPacienteRequest {
        public Long pacienteId;
    }

    @PostMapping("/{id}/vincular-paciente")
    public ResponseEntity<ExamenRecibidoPaciente> vincularPaciente(@PathVariable Long id, @RequestBody VincularPacienteRequest request) {
        Long tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.ok(portalService.vincularPaciente(tenantId, id, request.pacienteId));
    }
}
