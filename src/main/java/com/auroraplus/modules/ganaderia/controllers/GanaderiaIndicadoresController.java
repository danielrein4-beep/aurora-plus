package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.services.GanaderiaIndicadoresService;
import com.auroraplus.modules.ganaderia.services.GanaderiaTenantAccess;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Indicadores de gestión del hato (preñez, natalidad, intervalo entre partos, mortalidad...). */
@RestController
@RequestMapping("/api/ganaderia/indicadores")
public class GanaderiaIndicadoresController {

    @Autowired
    private GanaderiaIndicadoresService service;

    @GetMapping
    public GanaderiaIndicadoresService.Indicadores indicadores() {
        return service.calcular(GanaderiaTenantAccess.requireTenant());
    }
}
