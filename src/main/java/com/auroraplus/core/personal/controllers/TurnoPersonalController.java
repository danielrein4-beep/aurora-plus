package com.auroraplus.core.personal.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.personal.entities.TurnoPersonal;
import com.auroraplus.core.personal.services.TurnoPersonalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
}
