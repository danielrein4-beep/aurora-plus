package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.entities.OdontogramaDiente;
import com.auroraplus.modules.salud.entities.Paciente;
import com.auroraplus.modules.salud.repositories.OdontogramaDienteRepository;
import com.auroraplus.modules.salud.repositories.PacienteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Odontograma (Mediclinic Odonto) — mapa diente-por-diente en notación FDI.
 * Mismo criterio de seguridad que ConsultaMedicaController: tenant
 * EXCLUSIVAMENTE de TenantContext (JWT verificado), nunca por parámetro, y
 * mismo RBAC clínico (solo MEDICO/DUENO_ADMIN/SUPER_ADMIN pueden ver o tocar
 * el odontograma — es dato clínico, igual que una historia).
 */
@RestController
@RequestMapping("/api/salud/odontograma")
public class OdontogramaController {

    @Autowired
    private OdontogramaDienteRepository odontogramaDienteRepository;

    @Autowired
    private PacienteRepository pacienteRepository;

    private void validarPermisoClinico() {
        String rol = AuthContext.getRol();
        if (rol != null && !"DUENO_ADMIN".equalsIgnoreCase(rol) && !"MEDICO".equalsIgnoreCase(rol) && !"SUPER_ADMIN".equalsIgnoreCase(rol)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Acceso denegado: el odontograma es información clínica confidencial, restringida a Médicos y Administradores.");
        }
    }

    private Paciente obtenerPacienteDelTenant(Long tenantId, Long pacienteId) {
        return pacienteRepository.findByTenantIdAndId(tenantId, pacienteId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paciente no encontrado"));
    }

    @GetMapping
    public List<OdontogramaDiente> listar(@RequestParam Long pacienteId) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        obtenerPacienteDelTenant(tenantId, pacienteId);
        return odontogramaDienteRepository.findByTenantIdAndPacienteId(tenantId, pacienteId);
    }

    public static class ActualizarDienteRequest {
        public Long pacienteId;
        public Integer numeroFdi;
        public OdontogramaDiente.EstadoDiente estado;
        public String notas;
    }

    /** Upsert del estado de un diente — un solo registro vigente por (paciente, numeroFdi). */
    @PutMapping("/diente")
    @Transactional
    public ResponseEntity<OdontogramaDiente> actualizarDiente(@RequestBody ActualizarDienteRequest request) {
        validarPermisoClinico();
        if (request.numeroFdi == null || request.numeroFdi < 11 || request.numeroFdi > 85) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Número FDI inválido: " + request.numeroFdi);
        }
        Long tenantId = TenantContext.getCurrentTenant();
        Paciente paciente = obtenerPacienteDelTenant(tenantId, request.pacienteId);

        OdontogramaDiente diente = odontogramaDienteRepository
            .findByTenantIdAndPacienteIdAndNumeroFdi(tenantId, request.pacienteId, request.numeroFdi)
            .orElseGet(() -> {
                OdontogramaDiente nuevo = new OdontogramaDiente();
                nuevo.setTenantId(tenantId);
                nuevo.setPaciente(paciente);
                nuevo.setNumeroFdi(request.numeroFdi);
                return nuevo;
            });

        diente.setEstado(request.estado != null ? request.estado : OdontogramaDiente.EstadoDiente.SANO);
        diente.setNotas(request.notas);
        diente.setFechaActualizacion(LocalDateTime.now());

        return ResponseEntity.ok(odontogramaDienteRepository.save(diente));
    }
}
