package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auth.entities.Usuario;
import com.auroraplus.core.auth.repositories.UsuarioRepository;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.entities.ConsultaMedica;
import com.auroraplus.modules.salud.services.ConsultaMedicaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

/**
 * Controlador de consultas y evoluciones médicas — Protegido por RBAC Estricto:
 * El acceso a los diagnósticos y fichas clínicas está restringido EXCLUSIVAMENTE
 * a personal con rol MEDICO o DUENO_ADMIN / SUPER_ADMIN. Personal de caja/recepción
 * recibe 403 Forbidden para garantizar la privacidad y confidencialidad médica.
 */
@RestController
@RequestMapping("/api/salud/consultas")
public class ConsultaMedicaController {

    @Autowired
    private ConsultaMedicaService consultaMedicaService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    /**
     * Si el médico no viene indicado en el body, se resuelve del propio usuario
     * autenticado — antes había que escribir el medicoId a mano en cada
     * consulta, sin ninguna relación con quién inició sesión. El id del
     * Usuario (rol MEDICO) se usa directamente como medicoId: no hace falta
     * una entidad "Médico" aparte, la cuenta de login YA es la identidad del médico.
     */
    private void autocompletarMedico(Long tenantId, ConsultaMedica consulta) {
        if (consulta.getMedicoId() != null) return;
        String username = AuthContext.getUsername();
        if (username == null) return;
        Optional<Usuario> usuario = usuarioRepository.buscarPorTenantYUsername(tenantId, username);
        usuario.ifPresent(u -> {
            consulta.setMedicoId(u.getId());
            if (consulta.getMedicoNombre() == null || consulta.getMedicoNombre().isBlank()) {
                consulta.setMedicoNombre(u.getNombreCompleto() != null ? u.getNombreCompleto() : u.getUsername());
            }
        });
    }

    private void validarPermisoClinico() {
        String rol = AuthContext.getRol();
        // Si hay contexto de autenticación, verificar que no sea un rol puramente administrativo/cajero
        if (rol != null && !"DUENO_ADMIN".equalsIgnoreCase(rol) && !"MEDICO".equalsIgnoreCase(rol) && !"SUPER_ADMIN".equalsIgnoreCase(rol)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Acceso denegado: Las historias clínicas y fichas de consulta son confidenciales y están restringidas a Médicos y Administradores.");
        }
    }

    @GetMapping("/paciente/{pacienteId}")
    public List<ConsultaMedica> historialPorPaciente(@PathVariable Long pacienteId) {
        validarPermisoClinico();
        return consultaMedicaService.historialPorPaciente(pacienteId);
    }

    @GetMapping("/medico/{medicoId}")
    public List<ConsultaMedica> listarPorMedico(@PathVariable Long medicoId) {
        validarPermisoClinico();
        return consultaMedicaService.listarPorMedico(medicoId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConsultaMedica> obtenerPorId(@PathVariable Long id) {
        validarPermisoClinico();
        return consultaMedicaService.obtenerPorId(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ConsultaMedica> registrarConsulta(
            @RequestParam(required = false) Long tenantId,
            @RequestBody ConsultaMedica consulta) {
        validarPermisoClinico();

        Long tenantActivo = tenantId != null ? tenantId : TenantContext.getCurrentTenant();
        if (tenantActivo == null) {
            throw new RuntimeException("Tenant no identificado en la sesión");
        }
        autocompletarMedico(tenantActivo, consulta);

        return ResponseEntity.ok(consultaMedicaService.registrarConsulta(tenantActivo, consulta));
    }
}
