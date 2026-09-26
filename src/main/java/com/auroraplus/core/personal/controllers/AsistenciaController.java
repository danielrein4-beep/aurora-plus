package com.auroraplus.core.personal.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.personal.entities.RegistroAsistencia;
import com.auroraplus.core.personal.services.AsistenciaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;

@RestController
@RequestMapping("/api/personal/asistencia")
public class AsistenciaController {

    public record RegistrarSalidaRequest(LocalDateTime fechaHoraSalida) {}

    @Autowired
    private AsistenciaService asistenciaService;

    @PostMapping("/entrada")
    public RegistroAsistencia registrarEntrada(@RequestBody RegistroAsistencia registro) {
        return asistenciaService.registrarEntrada(TenantContext.getCurrentTenant(), registro);
    }

    @PatchMapping("/{id}/salida")
    public RegistroAsistencia registrarSalida(@PathVariable Long id, @RequestBody RegistrarSalidaRequest request) {
        return asistenciaService.registrarSalida(TenantContext.getCurrentTenant(), id, request.fechaHoraSalida());
    }

    /** El trabajador vinculado a este usuario: su estado de hoy y sus últimos marcajes. */
    @GetMapping("/mia")
    public AsistenciaService.EstadoMiAsistencia miEstado() {
        return asistenciaService.miEstado(TenantContext.getCurrentTenant());
    }

    /** Marca la entrada del propio trabajador con la hora del servidor. */
    @PostMapping("/mia/entrada")
    public RegistroAsistencia marcarMiEntrada() {
        return asistenciaService.marcarMiEntrada(TenantContext.getCurrentTenant());
    }

    /** Marca la salida del propio trabajador con la hora del servidor. */
    @PostMapping("/mia/salida")
    public RegistroAsistencia marcarMiSalida() {
        return asistenciaService.marcarMiSalida(TenantContext.getCurrentTenant());
    }

    @GetMapping("/empleado/{empleadoId}")
    public List<RegistroAsistencia> listarDeEmpleado(@PathVariable Long empleadoId) {
        return asistenciaService.listarDeEmpleado(TenantContext.getCurrentTenant(), empleadoId);
    }

    @GetMapping
    public List<RegistroAsistencia> listarRango(
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return asistenciaService.listarRango(TenantContext.getCurrentTenant(), desde, hasta);
    }
}
