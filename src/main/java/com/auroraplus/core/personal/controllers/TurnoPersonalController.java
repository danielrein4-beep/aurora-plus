package com.auroraplus.core.personal.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.personal.entities.TurnoPersonal;
import com.auroraplus.core.personal.services.TurnoPersonalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;

@RestController
@RequestMapping("/api/personal/turnos")
public class TurnoPersonalController {

    @Autowired
    private TurnoPersonalService turnoPersonalService;

    @PostMapping
    public TurnoPersonal crear(@RequestBody TurnoPersonal turno) {
        return turnoPersonalService.crear(TenantContext.getCurrentTenant(), turno);
    }

    @GetMapping("/empleado/{empleadoId}")
    public List<TurnoPersonal> listarDeEmpleado(@PathVariable Long empleadoId) {
        return turnoPersonalService.listarDeEmpleado(TenantContext.getCurrentTenant(), empleadoId);
    }

    @GetMapping
    public List<TurnoPersonal> listarRango(
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return turnoPersonalService.listarRango(TenantContext.getCurrentTenant(), desde, hasta);
    }
}
