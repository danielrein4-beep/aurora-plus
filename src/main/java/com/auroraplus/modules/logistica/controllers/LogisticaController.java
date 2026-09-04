package com.auroraplus.modules.logistica.controllers;

import com.auroraplus.modules.logistica.entities.RutaTransporte;
import com.auroraplus.modules.logistica.services.LogisticaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/logistica/fletes")
public class LogisticaController {

    @Autowired
    private LogisticaService logisticaService;

    @PostMapping("/registrar")
    public ResponseEntity<RutaTransporte> registrarFlete(
            @RequestParam Long tenantId,
            @RequestParam String origen,
            @RequestParam String destino,
            @RequestParam String placaVehiculo,
            @RequestParam BigDecimal costoFlete) {

        RutaTransporte ruta = logisticaService.registrarFlete(tenantId, origen, destino, placaVehiculo, costoFlete);
        return ResponseEntity.ok(ruta);
    }
}
