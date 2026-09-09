package com.auroraplus.modules.salud.laboratorio.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.laboratorio.entities.OrdenLaboratorio;
import com.auroraplus.modules.salud.laboratorio.services.SaludLaboratorioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/salud/laboratorio/ordenes")
public class OrdenLaboratorioController {

    @Autowired
    private SaludLaboratorioService laboratorioService;

    @PostMapping
    public ResponseEntity<OrdenLaboratorio> crearOrden(@RequestBody OrdenLaboratorio orden) {
        Long tenantId = TenantContext.getCurrentTenant();
        OrdenLaboratorio creada = laboratorioService.crearOrden(tenantId, orden);
        return ResponseEntity.ok(creada);
    }

    @GetMapping
    public ResponseEntity<List<OrdenLaboratorio>> listarOrdenes() {
        Long tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.ok(laboratorioService.listarPorTenant(tenantId));
    }

    @GetMapping("/paciente/{pacienteId}")
    public ResponseEntity<List<OrdenLaboratorio>> listarPorPaciente(@PathVariable Long pacienteId) {
        Long tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.ok(laboratorioService.listarPorPaciente(tenantId, pacienteId));
    }

    @GetMapping("/inbox")
    public ResponseEntity<List<OrdenLaboratorio>> listarInbox() {
        Long tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.ok(laboratorioService.listarInbox(tenantId));
    }

    @GetMapping("/inbox/contador")
    public ResponseEntity<Map<String, Long>> contadorInbox() {
        Long tenantId = TenantContext.getCurrentTenant();
        long pendientes = laboratorioService.contarPendientesInbox(tenantId);
        return ResponseEntity.ok(Map.of("pendientes", pendientes));
    }

    @PostMapping("/{id}/revisar")
    public ResponseEntity<OrdenLaboratorio> marcarRevisado(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body
    ) {
        Long tenantId = TenantContext.getCurrentTenant();
        String notas = body != null ? body.get("notas") : null;
        OrdenLaboratorio actualizada = laboratorioService.marcarRevisadoPorMedico(tenantId, id, notas);
        return ResponseEntity.ok(actualizada);
    }
}
