package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.entities.Paciente;
import com.auroraplus.modules.salud.services.PacienteService;
import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Hardening de aislamiento por tenant (piloto P0, docs auditoría tenantId): antes cada endpoint
 * aceptaba un tenantId opcional por query que GANABA sobre TenantContext si el cliente lo
 * mandaba — un usuario autenticado del tenant B podía leer/crear/editar/desactivar pacientes de
 * CUALQUIER tenant con solo mandar el tenantId ajeno en la URL. Ahora el tenant sale
 * EXCLUSIVAMENTE de TenantContext (JWT verificado), sin excepción ni fallback silencioso.
 */
@RestController
@RequestMapping("/api/salud/pacientes")
public class PacienteController {

    @Autowired
    private PacienteService pacienteService;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private RegistroAuditoriaService auditoriaService;

    // El filtro de Hibernate habilitado en TenantInterceptor no persiste hasta la sesión que
    // ejecuta la query real — se re-habilita aquí explícitamente antes de cualquier lectura,
    // como defensa adicional (aunque los métodos de PacienteService ya filtran explícitamente
    // por tenantId en cada query, sin depender de este filtro).
    private void asegurarFiltroTenant() {
        entityManager.unwrap(Session.class).enableFilter("tenantFilter")
            .setParameter("tenantId", TenantContext.getCurrentTenant());
    }

    @GetMapping
    public List<Paciente> listar(@RequestParam(required = false) String buscar) {
        asegurarFiltroTenant();
        return pacienteService.buscar(TenantContext.getCurrentTenant(), buscar);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Paciente> obtener(@PathVariable Long id) {
        asegurarFiltroTenant();
        return pacienteService.obtenerPorId(TenantContext.getCurrentTenant(), id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/identificacion/{identificacion}")
    public ResponseEntity<Paciente> buscarPorIdentificacion(@PathVariable String identificacion) {
        asegurarFiltroTenant();
        return pacienteService.obtenerPorIdentificacion(TenantContext.getCurrentTenant(), identificacion)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Paciente> registrar(@RequestBody Paciente paciente) {
        return ResponseEntity.ok(pacienteService.crear(TenantContext.getCurrentTenant(), paciente));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Paciente> actualizar(@PathVariable Long id, @RequestBody Paciente datos) {
        return ResponseEntity.ok(pacienteService.actualizar(TenantContext.getCurrentTenant(), id, datos));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        AuthContext.exigirRol("DUENO_ADMIN", "MEDICO");
        asegurarFiltroTenant();
        Long tenantId = TenantContext.getCurrentTenant();
        pacienteService.desactivar(tenantId, id);
        auditoriaService.registrar(tenantId, "SALUD", "ELIMINAR", "Paciente", id, "Desactivó un paciente");
        return ResponseEntity.noContent().build();
    }
}
