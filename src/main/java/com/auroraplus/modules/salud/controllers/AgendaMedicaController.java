package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.entities.BloqueoAgenda;
import com.auroraplus.modules.salud.entities.CitaMedica;
import com.auroraplus.modules.salud.services.AgendaMedicaService;
import com.auroraplus.modules.salud.services.MedicoTenantResolver;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/salud/agenda")
public class AgendaMedicaController {

    @Autowired
    private AgendaMedicaService agendaMedicaService;

    @Autowired
    private MedicoTenantResolver medicoTenantResolver;

    /**
     * Cada tenant es la práctica de UN SOLO médico — recepción nunca necesita
     * elegir/escribir a qué médico corresponde una cita o un bloqueo, siempre
     * es el único médico de este tenant (ver MedicoTenantResolver).
     */
    private void autocompletarMedico(Long tenantId, CitaMedica cita) {
        if (cita.getMedicoId() != null) return;
        medicoTenantResolver.resolverMedicoDelTenant(tenantId).ifPresent(m -> {
            cita.setMedicoId(m.id);
            if (cita.getMedicoNombre() == null || cita.getMedicoNombre().isBlank()) {
                cita.setMedicoNombre(m.nombre);
            }
        });
    }

    private void autocompletarMedico(Long tenantId, BloqueoAgenda bloqueo) {
        if (bloqueo.getMedicoId() != null) return;
        medicoTenantResolver.resolverMedicoDelTenant(tenantId).ifPresent(m -> bloqueo.setMedicoId(m.id));
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
        autocompletarMedico(tenantActivo, cita);
        return ResponseEntity.ok(agendaMedicaService.agendarCita(tenantActivo, cita));
    }

    @PatchMapping("/citas/{id}/estado")
    public ResponseEntity<CitaMedica> actualizarEstado(@PathVariable Long id, @RequestParam CitaMedica.EstadoCita estado) {
        return ResponseEntity.ok(agendaMedicaService.actualizarEstado(id, estado));
    }

    @PostMapping("/bloqueos")
    public ResponseEntity<BloqueoAgenda> registrarBloqueo(@RequestParam(required = false) Long tenantId, @RequestBody BloqueoAgenda bloqueo) {
        Long tenantActivo = tenantId != null ? tenantId : TenantContext.getCurrentTenant();
        autocompletarMedico(tenantActivo, bloqueo);
        return ResponseEntity.ok(agendaMedicaService.registrarBloqueo(tenantActivo, bloqueo));
    }

    @GetMapping("/bloqueos/medico/{medicoId}")
    public List<BloqueoAgenda> listarBloqueosPorMedico(@PathVariable Long medicoId) {
        return agendaMedicaService.listarBloqueosPorMedico(medicoId);
    }
}
