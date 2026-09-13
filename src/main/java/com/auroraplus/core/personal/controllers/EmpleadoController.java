package com.auroraplus.core.personal.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.personal.entities.AsignacionEmpleado;
import com.auroraplus.core.personal.entities.Empleado;
import com.auroraplus.core.personal.services.EmpleadoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Tenant siempre desde TenantContext — nunca de la URL/query (mismo criterio de todo el proyecto).
 * Bean nombrado explícitamente: ya existe un EmpleadoController en tamanacocomercial (mismo
 * nombre de clase, distinto paquete) — mismo criterio ya usado en TesoreriaController.
 */
@RestController("personalEmpleadoController")
@RequestMapping("/api/personal/empleados")
public class EmpleadoController {

    @Autowired
    private EmpleadoService empleadoService;

    @GetMapping
    public List<Empleado> listar() {
        return empleadoService.listar(TenantContext.getCurrentTenant());
    }

    @PostMapping
    public Empleado crear(@RequestBody Empleado empleado) {
        return empleadoService.crear(TenantContext.getCurrentTenant(), empleado);
    }

    @PostMapping("/{id}/asignaciones")
    public AsignacionEmpleado asignarCargo(@PathVariable Long id, @RequestBody AsignacionEmpleado asignacion,
                                            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaCorte) {
        return empleadoService.asignarCargo(TenantContext.getCurrentTenant(), id, asignacion, fechaCorte);
    }
}
