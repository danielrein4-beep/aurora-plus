package com.auroraplus.modules.veterinaria.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.veterinaria.entities.BloqueoAgendaVet;
import com.auroraplus.modules.veterinaria.entities.CitaVeterinaria;
import com.auroraplus.modules.veterinaria.services.AgendaVeterinariaService;
import com.auroraplus.modules.veterinaria.services.VeterinarioTenantResolver;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/veterinaria/agenda")
public class AgendaVeterinariaController {

    @Autowired
    private AgendaVeterinariaService agendaVeterinariaService;

    @Autowired
    private VeterinarioTenantResolver veterinarioTenantResolver;

    private void autocompletarVeterinario(Long tenantId, CitaVeterinaria cita) {
        if (cita.getVeterinarioId() != null) return;
        veterinarioTenantResolver.resolverVeterinarioDelTenant(tenantId).ifPresent(v -> {
            cita.setVeterinarioId(v.id);
            if (cita.getVeterinarioNombre() == null || cita.getVeterinarioNombre().isBlank()) {
                cita.setVeterinarioNombre(v.nombre);
            }
        });
    }

    private void autocompletarVeterinario(Long tenantId, BloqueoAgendaVet bloqueo) {
        if (bloqueo.getVeterinarioId() != null) return;
        veterinarioTenantResolver.resolverVeterinarioDelTenant(tenantId).ifPresent(v -> bloqueo.setVeterinarioId(v.id));
    }

    @GetMapping
    public List<CitaVeterinaria> listarCitas(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(required = false) Long veterinarioId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin) {

        if (fechaInicio != null && fechaFin != null) {
            return agendaVeterinariaService.listarPorRango(fechaInicio, fechaFin);
        }
        LocalDate f = (fecha != null) ? fecha : LocalDate.now();
        if (veterinarioId != null) {
            return agendaVeterinariaService.listarPorVeterinarioYFecha(veterinarioId, f);
        }
        return agendaVeterinariaService.listarPorFecha(f);
    }

    @GetMapping("/mascota/{mascotaId}")
    public List<CitaVeterinaria> historialPorMascota(@PathVariable Long mascotaId) {
        return agendaVeterinariaService.historialPorMascota(mascotaId);
    }

    @PostMapping("/citas")
    public ResponseEntity<CitaVeterinaria> agendarCita(@RequestParam(required = false) Long tenantId, @RequestBody CitaVeterinaria cita) {
        Long tenantActivo = com.auroraplus.modules.veterinaria.services.VeterinariaTenantGuard.resolver(tenantId);
        autocompletarVeterinario(tenantActivo, cita);
        return ResponseEntity.ok(agendaVeterinariaService.agendarCita(tenantActivo, cita));
    }

    @PatchMapping("/citas/{id}/estado")
    public ResponseEntity<CitaVeterinaria> actualizarEstado(@PathVariable Long id, @RequestParam CitaVeterinaria.EstadoCita estado) {
        return ResponseEntity.ok(agendaVeterinariaService.actualizarEstado(id, estado));
    }

    public record ReprogramarCitaRequest(LocalDate fecha, java.time.LocalTime horaInicio, java.time.LocalTime horaFin) {}

    @PatchMapping("/citas/{id}/reprogramar")
    public ResponseEntity<CitaVeterinaria> reprogramarCita(@PathVariable Long id, @RequestBody ReprogramarCitaRequest datos) {
        return ResponseEntity.ok(agendaVeterinariaService.reprogramarCita(id, datos.fecha(), datos.horaInicio(), datos.horaFin()));
    }

    @PostMapping("/bloqueos")
    public ResponseEntity<BloqueoAgendaVet> registrarBloqueo(@RequestParam(required = false) Long tenantId, @RequestBody BloqueoAgendaVet bloqueo) {
        Long tenantActivo = com.auroraplus.modules.veterinaria.services.VeterinariaTenantGuard.resolver(tenantId);
        autocompletarVeterinario(tenantActivo, bloqueo);
        return ResponseEntity.ok(agendaVeterinariaService.registrarBloqueo(tenantActivo, bloqueo));
    }

    @GetMapping("/bloqueos/veterinario/{veterinarioId}")
    public List<BloqueoAgendaVet> listarBloqueosPorVeterinario(@PathVariable Long veterinarioId) {
        return agendaVeterinariaService.listarBloqueosPorVeterinario(veterinarioId);
    }

    @DeleteMapping("/bloqueos/{id}")
    public ResponseEntity<Void> eliminarBloqueo(@PathVariable Long id) {
        agendaVeterinariaService.eliminarBloqueo(id);
        return ResponseEntity.noContent().build();
    }
}
