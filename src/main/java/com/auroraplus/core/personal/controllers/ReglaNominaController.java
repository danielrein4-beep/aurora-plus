package com.auroraplus.core.personal.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.personal.entities.ReglaNominaVersionada;
import com.auroraplus.core.personal.services.ReglaNominaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/** Solo POST — nunca PUT/editar (docs/personal-nomina-contract.md §3: ReglaNominaVersionada es inmutable). */
@RestController
@RequestMapping("/api/personal/nomina/reglas")
public class ReglaNominaController {

    @Autowired
    private ReglaNominaService reglaNominaService;

    @PostMapping
    public ReglaNominaVersionada crearNuevaVersion(@RequestBody ReglaNominaVersionada regla,
                                                    @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate vigenciaDesde) {
        return reglaNominaService.crearNuevaVersion(TenantContext.getCurrentTenant(), regla, vigenciaDesde);
    }
}
