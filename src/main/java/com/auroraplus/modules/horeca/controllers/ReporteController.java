package com.auroraplus.modules.horeca.controllers;

import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.services.ReporteService;
import com.auroraplus.modules.horeca.services.ReporteTicketDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/** Reportes Operativos (Fase 1 del plan de escalamiento) — consultas de solo lectura, separadas del flujo caliente del POS. */
@RestController
@RequestMapping("/api/horeca/reportes")
public class ReporteController {

    @Autowired
    private ReporteService reporteService;

    @GetMapping("/tickets")
    public ResponseEntity<List<ReporteTicketDTO>> tickets(
            @RequestParam Long tenantId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin,
            @RequestParam(required = false) String metodoPago,
            @RequestParam(required = false) Comanda.EstadoComanda estado) {
        return ResponseEntity.ok(reporteService.buscarTickets(tenantId, fechaInicio, fechaFin, metodoPago, estado));
    }
}
