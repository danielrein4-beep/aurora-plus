package com.auroraplus.modules.minero.controllers;

import com.auroraplus.modules.minero.entities.TransformacionMineral;
import com.auroraplus.modules.minero.services.TransformacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/minero/transformacion")
public class TransformacionController {

    @Autowired
    private TransformacionService transformacionService;

    @PostMapping("/registrar")
    public ResponseEntity<TransformacionMineral> registrarTransformacion(
            @RequestParam Long tenantId,
            @RequestParam String loteOrigen,
            @RequestParam BigDecimal cantidadBruta,
            @RequestParam BigDecimal cantidadGrano,
            @RequestParam BigDecimal cantidadMenudo,
            @RequestParam BigDecimal cantidadFino,
            @RequestParam BigDecimal porcentajeCeniza) {

        TransformacionMineral transformacion = transformacionService.registrarTransformacion(
            tenantId, loteOrigen, cantidadBruta, cantidadGrano, cantidadMenudo, cantidadFino, porcentajeCeniza);

        return ResponseEntity.ok(transformacion);
    }
}
