package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auth.entities.Usuario;
import com.auroraplus.core.auth.repositories.UsuarioRepository;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.entities.BloqueoAgenda;
import com.auroraplus.modules.salud.entities.CitaMedica;
import com.auroraplus.modules.salud.services.AgendaMedicaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/salud/agenda")
public class AgendaMedicaController {

    @Autowired
    private AgendaMedicaService agendaMedicaService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    /**
     * Solo aplica a bloqueos (un médico bloqueando SU PROPIA agenda) — NO a
     * citas, porque quien agenda una cita normalmente es recepción reservando
     * para OTRO médico, así que ahí el medicoId sí debe venir explícito.
     */
    private void autocompletarMedicoPropio(Long tenantId, BloqueoAgenda bloqueo) {
        if (bloqueo.getMedicoId() != null) return;
        String username = AuthContext.getUsername();
        if (username == null) return;
        Optional<Usuario> usuario = usuarioRepository.buscarPorTenantYUsername(tenantId, username);
        usuario.ifPresent(u -> bloqueo.setMedicoId(u.getId()));
    }

    @GetMapping
    public List<CitaMedica> listarCitas(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(required = false) Long medicoId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin) {

        if (fechaInicio != null && fechaFin != null) {
            return agendaMedicaService.listarPorRango(fechaInicio, fechaFin);
        }
        LocalDate f = (fecha != null) ? fecha : LocalDate.now();
        if (medicoId != null) {
            return agendaMedicaService.listarPorMedicoYFecha(medicoId, f);
        }
        return agendaMedicaService.listarPorFecha(f);
    }

    @GetMapping("/paciente/{pacienteId}")
    public List<CitaMedica> historialPorPaciente(@PathVariable Long pacienteId) {
        return agendaMedicaService.historialPorPaciente(pacienteId);
    }

    @PostMapping("/citas")
    public ResponseEntity<CitaMedica> agendarCita(@RequestParam(required = false) Long tenantId, @RequestBody CitaMedica cita) {
        Long tenantActivo = tenantId != null ? tenantId : TenantContext.getCurrentTenant();
        return ResponseEntity.ok(agendaMedicaService.agendarCita(tenantActivo, cita));
    }

    @PatchMapping("/citas/{id}/estado")
    public ResponseEntity<CitaMedica> actualizarEstado(@PathVariable Long id, @RequestParam CitaMedica.EstadoCita estado) {
        return ResponseEntity.ok(agendaMedicaService.actualizarEstado(id, estado));
    }

    @PostMapping("/bloqueos")
    public ResponseEntity<BloqueoAgenda> registrarBloqueo(@RequestParam(required = false) Long tenantId, @RequestBody BloqueoAgenda bloqueo) {
        Long tenantActivo = tenantId != null ? tenantId : TenantContext.getCurrentTenant();
        autocompletarMedicoPropio(tenantActivo, bloqueo);
        return ResponseEntity.ok(agendaMedicaService.registrarBloqueo(tenantActivo, bloqueo));
    }

    @GetMapping("/bloqueos/medico/{medicoId}")
    public List<BloqueoAgenda> listarBloqueosPorMedico(@PathVariable Long medicoId) {
        return agendaMedicaService.listarBloqueosPorMedico(medicoId);
    }
}
