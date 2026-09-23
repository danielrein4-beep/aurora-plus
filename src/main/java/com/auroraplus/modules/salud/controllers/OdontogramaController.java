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

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

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

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private static final Set<String> CARAS_VALIDAS = Set.of("O", "M", "D", "V", "L", "P", "I");

    private final ObjectMapper objectMapper = new ObjectMapper();

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
        public List<String> caras;
    }

    /** Cambios de las piezas del paciente, del mas reciente al mas antiguo. */
    @GetMapping("/historial")
    public List<Map<String, Object>> historial(@RequestParam Long pacienteId, @RequestParam(required = false) Integer numeroFdi) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        obtenerPacienteDelTenant(tenantId, pacienteId);
        if (numeroFdi != null) {
            return jdbcTemplate.queryForList(
                "SELECT id, numero_fdi, estado, caras_json::text AS caras_json, notas, usuario, fecha_registro " +
                "FROM salud_odontograma_historial WHERE tenant_id = ? AND paciente_id = ? AND numero_fdi = ? " +
                "ORDER BY fecha_registro DESC, id DESC",
                tenantId, pacienteId, numeroFdi);
        }
        return jdbcTemplate.queryForList(
            "SELECT id, numero_fdi, estado, caras_json::text AS caras_json, notas, usuario, fecha_registro " +
            "FROM salud_odontograma_historial WHERE tenant_id = ? AND paciente_id = ? " +
            "ORDER BY fecha_registro DESC, id DESC LIMIT 300",
            tenantId, pacienteId);
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
        if (request.caras != null) {
            List<String> caras = request.caras.stream()
                .map(c -> c == null ? "" : c.trim().toUpperCase())
                .filter(CARAS_VALIDAS::contains)
                .distinct()
                .toList();
            diente.setCaras(new java.util.ArrayList<>(caras));
        }
        diente.setFechaActualizacion(LocalDateTime.now());
        OdontogramaDiente guardado = odontogramaDienteRepository.save(diente);

        String carasJson;
        try {
            carasJson = objectMapper.writeValueAsString(guardado.getCaras());
        } catch (JsonProcessingException e) {
            carasJson = "[]";
        }
        jdbcTemplate.update(
            "INSERT INTO salud_odontograma_historial (tenant_id, paciente_id, numero_fdi, estado, caras_json, notas, usuario) " +
            "VALUES (?, ?, ?, ?, CAST(? AS jsonb), ?, ?)",
            tenantId, request.pacienteId, guardado.getNumeroFdi(), guardado.getEstado().name(),
            carasJson, guardado.getNotas(), AuthContext.getUsername());

        return ResponseEntity.ok(guardado);
    }
}
