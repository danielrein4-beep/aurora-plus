package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.GastoGanaderia;
import com.auroraplus.modules.ganaderia.repositories.GastoGanaderiaRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaGastoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/ganaderia/gastos")
public class GastoGanaderiaController {

    @Autowired
    private GanaderiaGastoService ganaderiaGastoService;

    @Autowired
    private GastoGanaderiaRepository gastoGanaderiaRepository;

    public static class GastoRequest {
        public String categoria;
        public String descripcion;
        public BigDecimal monto;
        public LocalDate fecha;
    }

    @GetMapping
    public List<GastoGanaderia> listar() {
        return gastoGanaderiaRepository.findAllByOrderByFechaDesc();
    }

    @PostMapping
    public ResponseEntity<GastoGanaderia> registrar(@RequestParam Long tenantId, @RequestBody GastoRequest request) {
        return ResponseEntity.ok(ganaderiaGastoService.registrarGasto(tenantId, request.categoria, request.descripcion, request.monto, request.fecha));
    }
}
