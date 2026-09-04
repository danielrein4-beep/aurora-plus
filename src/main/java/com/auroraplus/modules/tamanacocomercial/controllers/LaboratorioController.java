package com.auroraplus.modules.tamanacocomercial.controllers;

import com.auroraplus.modules.tamanacocomercial.dto.AnalisisLaboratorioDTO;
import com.auroraplus.modules.tamanacocomercial.entities.AnalisisLaboratorio;
import com.auroraplus.modules.tamanacocomercial.services.LaboratorioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tamanaco-comercial/laboratorio")
public class LaboratorioController {

    @Autowired
    private LaboratorioService laboratorioService;

    @PostMapping({"", "/guardar"})
    public ResponseEntity<?> registrarAnalisis(@RequestParam Long tenantId, @RequestBody AnalisisLaboratorioDTO dto) {
        try {
            AnalisisLaboratorio guardado = laboratorioService.guardarAnalisis(tenantId, dto);
            return ResponseEntity.ok(guardado);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Error interno"));
        }
    }

    @GetMapping("/semana")
    public ResponseEntity<List<AnalisisLaboratorio>> obtenerPorSemana(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        LocalDate ref = (fecha != null) ? fecha : LocalDate.now();
        LocalDate lunes = ref.with(DayOfWeek.MONDAY);
        LocalDate domingo = ref.with(DayOfWeek.SUNDAY);
        return ResponseEntity.ok(laboratorioService.listarPorRango(lunes, domingo));
    }

    @GetMapping("/calidad-semanal")
    public ResponseEntity<?> obtenerCalidadPonderadaSemanal(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin) {
        return ResponseEntity.ok(laboratorioService.obtenerCalidadPonderadaSemanal(fechaInicio, fechaFin));
    }

    @GetMapping("/mina/{nombreMina}")
    public ResponseEntity<List<AnalisisLaboratorio>> obtenerHistoricoMina(@PathVariable String nombreMina) {
        return ResponseEntity.ok(laboratorioService.listarPorMina(nombreMina));
    }

    @GetMapping
    public ResponseEntity<List<AnalisisLaboratorio>> obtenerHistorial() {
        return ResponseEntity.ok(laboratorioService.listarTodos());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarAnalisis(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody AnalisisLaboratorioDTO dto) {
        try {
            dto.setId(id);
            AnalisisLaboratorio actualizado = laboratorioService.guardarAnalisis(tenantId, dto);
            return ResponseEntity.ok(actualizado);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarAnalisis(@PathVariable Long id, @RequestParam Long tenantId) {
        try {
            laboratorioService.eliminarAnalisis(tenantId, id);
            return ResponseEntity.ok(Map.of("mensaje", "Análisis eliminado"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
