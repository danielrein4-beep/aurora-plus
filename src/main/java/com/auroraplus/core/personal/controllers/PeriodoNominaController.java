package com.auroraplus.core.personal.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.personal.entities.NominaEmpleado;
import com.auroraplus.core.personal.entities.PeriodoNomina;
import com.auroraplus.core.personal.services.MotorNominaService;
import com.auroraplus.core.personal.services.PeriodoNominaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/personal/nomina/periodos")
public class PeriodoNominaController {

    @Autowired
    private PeriodoNominaService periodoNominaService;

    @Autowired
    private MotorNominaService motorNominaService;

    @PostMapping
    public PeriodoNomina crear(@RequestBody PeriodoNomina periodo) {
        return periodoNominaService.crear(TenantContext.getCurrentTenant(), periodo);
    }

    @PostMapping("/{id}/calcular")
    public PeriodoNomina calcular(@PathVariable Long id) {
        return motorNominaService.calcularPeriodo(TenantContext.getCurrentTenant(), id);
    }

    @PostMapping("/{id}/aprobar")
    public PeriodoNomina aprobar(@PathVariable Long id) {
        return periodoNominaService.aprobar(TenantContext.getCurrentTenant(), id);
    }

    @PostMapping("/{id}/marcar-pagada")
    public PeriodoNomina marcarPagada(@PathVariable Long id) {
        return periodoNominaService.marcarPagada(TenantContext.getCurrentTenant(), id);
    }

    @GetMapping("/{id}/nominas")
    public List<NominaEmpleado> listarNominas(@PathVariable Long id) {
        return periodoNominaService.listarNominasDelPeriodo(TenantContext.getCurrentTenant(), id);
    }
}
