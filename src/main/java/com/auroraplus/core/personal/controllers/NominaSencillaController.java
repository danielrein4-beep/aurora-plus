package com.auroraplus.core.personal.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.personal.entities.AsignacionEmpleado;
import com.auroraplus.core.personal.entities.NominaEmpleado;
import com.auroraplus.core.personal.entities.PeriodoNomina;
import com.auroraplus.core.personal.services.MotorNominaService;
import com.auroraplus.core.personal.services.NominaSencillaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Nómina cómoda para el dueño (ver NominaSencillaService): sueldos, preparar, revisar, pagar y recibos. */
@RestController
@RequestMapping("/api/personal/nomina")
public class NominaSencillaController {

    @Autowired private NominaSencillaService nominaSencillaService;
    @Autowired private MotorNominaService motorNominaService;

    @GetMapping("/trabajadores")
    public List<NominaSencillaService.Trabajador> trabajadores() {
        return nominaSencillaService.trabajadores(TenantContext.getCurrentTenant());
    }

    @PutMapping("/sueldo/{empleadoId}")
    public AsignacionEmpleado ponerSueldo(@PathVariable Long empleadoId, @RequestBody NominaSencillaService.SueldoRequest request) {
        return nominaSencillaService.ponerSueldo(TenantContext.getCurrentTenant(), empleadoId, request);
    }

    public record PrepararRequest(String frecuencia, LocalDate desde, LocalDate hasta) {}

    @PostMapping("/preparar")
    public PeriodoNomina preparar(@RequestBody PrepararRequest request) {
        return nominaSencillaService.preparar(TenantContext.getCurrentTenant(), request.frecuencia(), request.desde(), request.hasta());
    }

    public record RevisionRequest(BigDecimal dias, BigDecimal horas, BigDecimal bono, BigDecimal descuento, String nota) {}

    @PutMapping("/recibos/{id}")
    public NominaEmpleado revisar(@PathVariable Long id, @RequestBody RevisionRequest r) {
        return motorNominaService.recalcularRecibo(TenantContext.getCurrentTenant(), id,
            new MotorNominaService.AjusteRevision(r.dias(), r.horas(), r.bono(), r.descuento(), r.nota()));
    }

    @DeleteMapping("/recibos/{id}")
    public Map<String, Boolean> quitar(@PathVariable Long id) {
        nominaSencillaService.quitarRecibo(TenantContext.getCurrentTenant(), id);
        return Map.of("quitado", true);
    }

    @GetMapping("/recibos/{id}")
    public NominaSencillaService.ReciboImprimible recibo(@PathVariable Long id) {
        return nominaSencillaService.recibo(TenantContext.getCurrentTenant(), id);
    }

    @PostMapping("/periodos/{id}/pagar")
    public PeriodoNomina pagar(@PathVariable Long id) {
        return nominaSencillaService.pagar(TenantContext.getCurrentTenant(), id);
    }

    @DeleteMapping("/periodos/{id}")
    public Map<String, Boolean> descartar(@PathVariable Long id) {
        nominaSencillaService.descartar(TenantContext.getCurrentTenant(), id);
        return Map.of("descartado", true);
    }
}
