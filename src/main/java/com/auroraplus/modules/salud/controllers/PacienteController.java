package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.entities.Paciente;
import com.auroraplus.modules.salud.services.PacienteService;
import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/salud/pacientes")
public class PacienteController {

    @Autowired
    private PacienteService pacienteService;

    @Autowired
    private EntityManager entityManager;

    // El filtro de Hibernate habilitado en TenantInterceptor no persiste hasta
    // la sesión que ejecuta la query real (hallazgo de seguridad — un tenant
    // podía ver pacientes de TODOS los demás tenants). Se re-habilita aquí
    // explícitamente antes de cualquier lectura.
    private void asegurarFiltroTenant() {
        entityManager.unwrap(Session.class).enableFilter("tenantFilter")
            .setParameter("tenantId", TenantContext.getCurrentTenant());
    }

    // Misma restricción que ConsultaMedicaController.validarPermisoClinico():
    // la ficha del paciente es información clínica confidencial, no debe ser
    // visible para roles puramente administrativos/de recepción.
    private void validarPermisoClinico() {
        String rol = AuthContext.getRol();
        if (rol != null && !"DUENO_ADMIN".equalsIgnoreCase(rol) && !"MEDICO".equalsIgnoreCase(rol) && !"SUPER_ADMIN".equalsIgnoreCase(rol)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Acceso denegado: la ficha del paciente es confidencial y está restringida a Médicos y Administradores.");
        }
    }

    @GetMapping
    public List<Paciente> listar(@RequestParam(required = false) String buscar) {
        validarPermisoClinico();
        asegurarFiltroTenant();
        return pacienteService.buscar(buscar);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Paciente> obtener(@PathVariable Long id) {
        validarPermisoClinico();
        asegurarFiltroTenant();
        return pacienteService.obtenerPorId(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/identificacion/{identificacion}")
    public ResponseEntity<Paciente> buscarPorIdentificacion(@PathVariable String identificacion) {
        validarPermisoClinico();
        asegurarFiltroTenant();
        return pacienteService.obtenerPorIdentificacion(identificacion)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Paciente> registrar(@RequestParam(required = false) Long tenantId, @RequestBody Paciente paciente) {
        Long tenantActivo = tenantId != null ? tenantId : TenantContext.getCurrentTenant();
        if (tenantActivo == null) {
            throw new RuntimeException("Tenant no identificado en la sesión");
        }
        return ResponseEntity.ok(pacienteService.registrarOActualizar(tenantActivo, paciente));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Paciente> actualizar(@PathVariable Long id, @RequestParam(required = false) Long tenantId, @RequestBody Paciente datos) {
        Long tenantActivo = tenantId != null ? tenantId : TenantContext.getCurrentTenant();
        datos.setId(id);
        return ResponseEntity.ok(pacienteService.registrarOActualizar(tenantActivo, datos));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        asegurarFiltroTenant();
        pacienteService.desactivar(id);
        return ResponseEntity.noContent().build();
    }
}
