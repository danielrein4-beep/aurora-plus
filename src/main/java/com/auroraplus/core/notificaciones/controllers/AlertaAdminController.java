package com.auroraplus.core.notificaciones.controllers;

import com.auroraplus.core.notificaciones.entities.AlertaAdmin;
import com.auroraplus.core.notificaciones.repositories.AlertaAdminRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Bandeja de alertas silenciosas para el rol administrador (descuadres de caja, etc.). */
@RestController
@RequestMapping("/api/admin/alertas")
public class AlertaAdminController {

    @Autowired
    private AlertaAdminRepository alertaAdminRepository;

    @GetMapping
    public List<AlertaAdmin> listar(@RequestParam Long tenantId, @RequestParam(required = false, defaultValue = "false") boolean soloNoLeidas) {
        return soloNoLeidas
            ? alertaAdminRepository.findByTenantIdAndLeidaFalseOrderByFechaCreacionDesc(tenantId)
            : alertaAdminRepository.findByTenantIdOrderByFechaCreacionDesc(tenantId);
    }

    @PatchMapping("/{id}/marcar-leida")
    public ResponseEntity<AlertaAdmin> marcarLeida(@PathVariable Long id, @RequestParam Long tenantId) {
        AlertaAdmin alerta = alertaAdminRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Alerta no encontrada"));
        if (!alerta.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: la alerta no pertenece a este tenant");
        }
        alerta.setLeida(true);
        return ResponseEntity.ok(alertaAdminRepository.save(alerta));
    }
}
