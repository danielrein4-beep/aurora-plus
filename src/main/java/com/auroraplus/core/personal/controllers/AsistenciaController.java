package com.auroraplus.core.personal.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.personal.entities.RegistroAsistencia;
import com.auroraplus.core.personal.services.AsistenciaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/personal/asistencia")
public class AsistenciaController {

    @Autowired
    private AsistenciaService asistenciaService;

    @PostMapping("/entrada")
    public RegistroAsistencia registrarEntrada(@RequestBody RegistroAsistencia registro) {
        return asistenciaService.registrarEntrada(TenantContext.getCurrentTenant(), registro);
    }

    @PatchMapping("/{id}/salida")
    public RegistroAsistencia registrarSalida(@PathVariable Long id, @RequestBody LocalDateTime salida) {
        return asistenciaService.registrarSalida(TenantContext.getCurrentTenant(), id, salida);
    }

    @GetMapping("/empleado/{empleadoId}")
    public List<RegistroAsistencia> listarDeEmpleado(@PathVariable Long empleadoId) {
        return asistenciaService.listarDeEmpleado(TenantContext.getCurrentTenant(), empleadoId);
    }
}
