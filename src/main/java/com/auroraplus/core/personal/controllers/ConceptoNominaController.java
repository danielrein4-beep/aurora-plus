package com.auroraplus.core.personal.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.personal.entities.ConceptoNomina;
import com.auroraplus.core.personal.services.ReglaNominaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/personal/nomina/conceptos")
public class ConceptoNominaController {

    @Autowired
    private ReglaNominaService reglaNominaService;

    @PostMapping
    public ConceptoNomina crear(@RequestBody ConceptoNomina concepto) {
        return reglaNominaService.crearConcepto(TenantContext.getCurrentTenant(), concepto);
    }
}
