package com.auroraplus.modules.minero.controllers;

import com.auroraplus.modules.minero.entities.NominaDestajo;
import com.auroraplus.modules.minero.entities.RegistroBocamina;
import com.auroraplus.modules.minero.repositories.BocaminaRepository;
import com.auroraplus.modules.minero.services.NominaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/minero")
public class MineroController {

    @Autowired
    private BocaminaRepository bocaminaRepository;

    @Autowired
    private NominaService nominaService;

    @PostMapping("/bocamina/registrar")
    public ResponseEntity<RegistroBocamina> registrarBocamina(
            @RequestParam Long tenantId,
            @RequestParam String frenteCorte,
            @RequestParam String turno,
            @RequestParam Integer cantidadVagonetas,
            @RequestParam BigDecimal toneladasEstimadas) {

        RegistroBocamina registro = new RegistroBocamina();
        registro.setTenantId(tenantId);
        registro.setFrenteCorte(frenteCorte);
        registro.setTurno(turno);
        registro.setCantidadVagonetas(cantidadVagonetas);
        registro.setToneladasEstimadas(toneladasEstimadas);
        registro.setFechaRegistro(LocalDateTime.now());

        RegistroBocamina guardado = bocaminaRepository.save(registro);
        return ResponseEntity.ok(guardado);
    }

    @PostMapping("/nomina-destajo/calcular")
    public ResponseEntity<NominaDestajo> calcularNominaDestajo(
            @RequestParam Long tenantId,
            @RequestParam String nombrePicador,
            @RequestParam BigDecimal toneladasProducidas,
            @RequestParam BigDecimal tarifaPorTonelada) {

        NominaDestajo nomina = nominaService.calcularYRegistrarDestajo(tenantId, nombrePicador, toneladasProducidas, tarifaPorTonelada);
        return ResponseEntity.ok(nomina);
    }
}
