package com.auroraplus.modules.veterinaria.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.veterinaria.entities.ConsultaVeterinaria;
import com.auroraplus.modules.veterinaria.services.ConsultaVeterinariaService;
import com.auroraplus.modules.veterinaria.services.VeterinarioTenantResolver;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/veterinaria/consultas")
public class ConsultaVeterinariaController {

    @Autowired
    private ConsultaVeterinariaService consultaVeterinariaService;

    @Autowired
    private VeterinarioTenantResolver veterinarioTenantResolver;

    private void autocompletarVeterinario(Long tenantId, ConsultaVeterinaria consulta) {
        if (consulta.getVeterinarioId() != null) return;
        veterinarioTenantResolver.resolverVeterinarioDelTenant(tenantId).ifPresent(v -> {
            consulta.setVeterinarioId(v.id);
            if (consulta.getVeterinarioNombre() == null || consulta.getVeterinarioNombre().isBlank()) {
                consulta.setVeterinarioNombre(v.nombre);
            }
        });
    }

    private void validarPermisoClinico() {
        String rol = AuthContext.getRol();
        if (rol != null && !"DUENO_ADMIN".equalsIgnoreCase(rol) && !"MEDICO".equalsIgnoreCase(rol) && !"SUPER_ADMIN".equalsIgnoreCase(rol)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Acceso denegado: Las historias clínicas veterinarias son confidenciales.");
        }
    }

    @GetMapping("/mascota/{mascotaId}")
    public List<ConsultaVeterinaria> historialPorMascota(@PathVariable Long mascotaId) {
        validarPermisoClinico();
        Long tenantActivo = TenantContext.getCurrentTenant();
        return consultaVeterinariaService.historialPorMascota(tenantActivo, mascotaId);
    }

    @GetMapping("/veterinario/{veterinarioId}")
    public List<ConsultaVeterinaria> listarPorVeterinario(@PathVariable Long veterinarioId) {
        validarPermisoClinico();
        return consultaVeterinariaService.listarPorVeterinario(veterinarioId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConsultaVeterinaria> obtenerPorId(@PathVariable Long id) {
        validarPermisoClinico();
        return consultaVeterinariaService.obtenerPorId(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ConsultaVeterinaria> registrarConsulta(
            @RequestBody ConsultaVeterinaria consulta) {
        validarPermisoClinico();

        Long tenantActivo = TenantContext.getCurrentTenant();
        if (tenantActivo == null) {
            throw new RuntimeException("Tenant no identificado en la sesión");
        }
        autocompletarVeterinario(tenantActivo, consulta);

        return ResponseEntity.ok(consultaVeterinariaService.registrarConsulta(tenantActivo, consulta));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarConsulta(
            @PathVariable Long id) {
        validarPermisoClinico();
        consultaVeterinariaService.eliminarConsulta(id);
        return ResponseEntity.noContent().build();
    }
}
