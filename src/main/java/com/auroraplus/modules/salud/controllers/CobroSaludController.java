package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.entities.CobroConsulta;
import com.auroraplus.modules.salud.entities.Paciente;
import com.auroraplus.modules.salud.services.PacienteService;
import com.auroraplus.modules.salud.services.SaludFinanzasService;
import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/salud/cobros")
public class CobroSaludController {

    @Autowired
    private SaludFinanzasService saludFinanzasService;

    @Autowired
    private PacienteService pacienteService;

    @Autowired
    private EntityManager entityManager;

    // Ver hallazgo de seguridad en PacienteController — el filtro de tenant
    // del interceptor no llega vivo hasta esta query, hay que re-habilitarlo.
    private void asegurarFiltroTenant() {
        entityManager.unwrap(Session.class).enableFilter("tenantFilter")
            .setParameter("tenantId", TenantContext.getCurrentTenant());
    }

    @PostMapping
    public ResponseEntity<CobroConsulta> procesarCobro(
            @RequestParam(required = false) Long tenantId,
            @RequestBody SaludFinanzasService.CobroRequest req) {

        Long tenantActivo = tenantId != null ? tenantId : TenantContext.getCurrentTenant();
        if (tenantActivo == null) {
            throw new RuntimeException("Tenant no identificado en la sesión");
        }

        if (req.cajeroUsuario == null || req.cajeroUsuario.isBlank()) {
            req.cajeroUsuario = AuthContext.getUsername() != null ? AuthContext.getUsername() : "Cajero";
        }

        Paciente paciente = null;
        if (req.pacienteId != null) {
            paciente = pacienteService.obtenerPorId(req.pacienteId).orElse(null);
        }

        return ResponseEntity.ok(saludFinanzasService.procesarCobro(tenantActivo, req, paciente));
    }

    @GetMapping("/paciente/{pacienteId}")
    public List<CobroConsulta> historialPorPaciente(@PathVariable Long pacienteId) {
        asegurarFiltroTenant();
        return saludFinanzasService.historialPorPaciente(pacienteId);
    }

    @GetMapping("/reporte")
    public List<CobroConsulta> reporteCobros(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fin) {
        asegurarFiltroTenant();
        return saludFinanzasService.listarPorRangoFechas(inicio, fin);
    }
}
