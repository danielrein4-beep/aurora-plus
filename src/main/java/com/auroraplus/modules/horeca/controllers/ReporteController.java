package com.auroraplus.modules.horeca.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.services.ReporteService;
import com.auroraplus.modules.horeca.services.ReporteTicketDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Reportes Operativos (Fase 1 del plan de escalamiento) — consultas de solo lectura, separadas
 * del flujo caliente del POS.
 *
 * Hardening de seguridad pre-piloto: antes recibía tenantId por query — cualquier usuario
 * autenticado de CUALQUIER negocio podía pedir los tickets de otro tenant con solo cambiar el
 * número en la URL. Ahora el tenant sale exclusivamente de TenantContext (JWT verificado).
 */
@RestController
@RequestMapping("/api/horeca/reportes")
public class ReporteController {

    @Autowired
    private ReporteService reporteService;

    @GetMapping("/tickets")
    public ResponseEntity<List<ReporteTicketDTO>> tickets(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin,
            @RequestParam(required = false) String metodoPago,
            @RequestParam(required = false) Comanda.EstadoComanda estado) {
        Long tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.ok(reporteService.buscarTickets(tenantId, fechaInicio, fechaFin, metodoPago, estado));
    }
}
