package com.auroraplus.modules.minero.controllers;

import com.auroraplus.modules.minero.entities.GastoMinero;
import com.auroraplus.modules.minero.repositories.GastoMineroRepository;
import com.auroraplus.modules.minero.services.GastoMineroService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/minero/gastos")
public class GastoMineroController {

    @Autowired
    private GastoMineroService gastoMineroService;

    @Autowired
    private GastoMineroRepository gastoMineroRepository;

    public static class GastoRequest {
        public String categoria;
        public String descripcion;
        public BigDecimal monto;
        public LocalDate fecha;
    }

    @GetMapping
    public List<GastoMinero> listar() {
        return gastoMineroRepository.findAllByOrderByFechaDesc();
    }

    @PostMapping
    public ResponseEntity<GastoMinero> registrar(@RequestParam Long tenantId, @RequestBody GastoRequest request) {
        return ResponseEntity.ok(gastoMineroService.registrarGasto(tenantId, request.categoria, request.descripcion, request.monto, request.fecha));
    }
}
