package com.auroraplus.modules.minero.controllers;

import com.auroraplus.modules.minero.entities.LiquidacionDestajo;
import com.auroraplus.modules.minero.repositories.LiquidacionDestajoRepository;
import com.auroraplus.modules.minero.services.LiquidacionDestajoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/minero/liquidaciones-destajo")
public class LiquidacionDestajoController {

    @Autowired
    private LiquidacionDestajoService liquidacionDestajoService;

    @Autowired
    private LiquidacionDestajoRepository liquidacionDestajoRepository;

    public static class TrabajadorRequest {
        public String nombreTrabajador;
        public Long tipoTrabajoId; // modalidad POR ROL
        public String rolLibre; // modalidad TARIFA ÚNICA — solo etiqueta
        public BigDecimal porcentajeParticipacion;
    }

    public static class LiquidacionRequest {
        public String frenteCorte;
        public LocalDate fecha;
        public BigDecimal produccionTotal;
        // Si se informan, se activa la modalidad "tarifa única de pareja": toda la
        // cuadrilla cobra sobre esta misma tarifa, repartida por porcentaje. Si se
        // omiten, cada trabajador debe traer tipoTrabajoId (modalidad por rol).
        public BigDecimal tarifaConjunta;
        public String monedaConjunta;
        public List<TrabajadorRequest> trabajadores;
    }

    @GetMapping
    public List<LiquidacionDestajo> listar() {
        return liquidacionDestajoRepository.findAllByOrderByFechaDesc();
    }

    @PostMapping
    public ResponseEntity<LiquidacionDestajo> registrar(@RequestParam Long tenantId, @RequestBody LiquidacionRequest request) {
        List<LiquidacionDestajoService.ItemTrabajador> items = request.trabajadores.stream().map(t -> {
            LiquidacionDestajoService.ItemTrabajador item = new LiquidacionDestajoService.ItemTrabajador();
            item.nombreTrabajador = t.nombreTrabajador;
            item.tipoTrabajoId = t.tipoTrabajoId;
            item.rolLibre = t.rolLibre;
            item.porcentajeParticipacion = t.porcentajeParticipacion;
            return item;
        }).toList();

        return ResponseEntity.ok(liquidacionDestajoService.registrarLiquidacion(
            tenantId, request.frenteCorte, request.fecha, request.produccionTotal,
            request.tarifaConjunta, request.monedaConjunta, items));
    }
}
