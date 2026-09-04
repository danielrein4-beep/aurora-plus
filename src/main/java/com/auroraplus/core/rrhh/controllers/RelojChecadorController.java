package com.auroraplus.core.rrhh.controllers;

import com.auroraplus.core.rrhh.entities.RegistroAsistencia;
import com.auroraplus.core.rrhh.repositories.RegistroAsistenciaRepository;
import com.auroraplus.core.rrhh.services.RelojChecadorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** Reloj checador: check-in/check-out de empleados y liquidación de horas trabajadas. */
@RestController
@RequestMapping("/api/rrhh/asistencia")
public class RelojChecadorController {

    @Autowired
    private RelojChecadorService relojChecadorService;

    @Autowired
    private RegistroAsistenciaRepository registroAsistenciaRepository;

    @PostMapping("/check-in")
    public ResponseEntity<RegistroAsistencia> checkIn(@RequestParam Long tenantId, @RequestParam Long empleadoId) {
        return ResponseEntity.ok(relojChecadorService.checkIn(tenantId, empleadoId));
    }

    @PostMapping("/check-out")
    public ResponseEntity<RegistroAsistencia> checkOut(@RequestParam Long tenantId, @RequestParam Long empleadoId) {
        return ResponseEntity.ok(relojChecadorService.checkOut(tenantId, empleadoId));
    }

    @GetMapping("/empleado/{empleadoId}")
    public List<RegistroAsistencia> historialEmpleado(@PathVariable Long empleadoId) {
        return registroAsistenciaRepository.findByEmpleadoIdOrderByFechaCheckInDesc(empleadoId);
    }

    @GetMapping("/liquidacion")
    public Map<String, Object> liquidarPeriodo(@RequestParam Long tenantId, @RequestParam LocalDateTime desde, @RequestParam LocalDateTime hasta) {
        return relojChecadorService.liquidarPeriodo(tenantId, desde, hasta);
    }
}
