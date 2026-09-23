package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.repositories.PacienteRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Documentos clinicos del odontologo: recetas y consentimientos informados.
 * Ambos quedan en el expediente del paciente; un consentimiento firmado no se
 * edita ni se borra (no hay endpoints para eso), solo se consulta.
 */
@RestController
@RequestMapping("/api/salud/odontologia")
public class OdontologiaDocumentosController {

    // Una firma dibujada en canvas pesa decenas de KB; el tope evita guardar imagenes arbitrarias.
    private static final int MAX_FIRMA_CHARS = 400_000;

    private static final Set<String> RELACIONES_FIRMANTE = Set.of("PACIENTE", "REPRESENTANTE_LEGAL", "PADRE_MADRE", "TUTOR");

    @Autowired
    private PacienteRepository pacienteRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private void validarPermisoClinico() {
        String rol = AuthContext.getRol();
        if (rol != null && !"DUENO_ADMIN".equalsIgnoreCase(rol) && !"MEDICO".equalsIgnoreCase(rol) && !"SUPER_ADMIN".equalsIgnoreCase(rol)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Acceso denegado: el expediente odontologico es informacion clinica confidencial.");
        }
    }

    private void validarPacienteDelTenant(Long tenantId, Long pacienteId) {
        if (pacienteId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paciente requerido.");
        }
        pacienteRepository.findByTenantIdAndId(tenantId, pacienteId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paciente no encontrado."));
    }

    private String nombreOdontologo(String enviado) {
        if (enviado != null && !enviado.isBlank()) return enviado.trim();
        String usuario = AuthContext.getUsername();
        return usuario != null && !usuario.isBlank() ? usuario : "Odontologo Tratante";
    }

    // ==========================================
    // RECETAS
    // ==========================================

    public static class ItemRecetaDTO {
        public String medicamento;
        public String presentacion;
        public String via;
        public String posologia;
        public Integer duracionDias;
        public String indicacionesEspeciales;
    }

    public static class CrearRecetaRequest {
        public Long pacienteId;
        public String odontologo;
        public String diagnostico;
        public List<ItemRecetaDTO> items;
        public String indicaciones;
    }

    @GetMapping("/recetas")
    public List<Map<String, Object>> listarRecetas(@RequestParam Long pacienteId) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        validarPacienteDelTenant(tenantId, pacienteId);
        return jdbcTemplate.queryForList(
            "SELECT id, odontologo, diagnostico, items_json::text AS items_json, indicaciones, fecha_registro " +
            "FROM salud_odontologia_recetas WHERE tenant_id = ? AND paciente_id = ? ORDER BY fecha_registro DESC, id DESC",
            tenantId, pacienteId);
    }

    @PostMapping("/recetas")
    @Transactional
    public ResponseEntity<?> crearReceta(@RequestBody CrearRecetaRequest req) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        validarPacienteDelTenant(tenantId, req.pacienteId);

        List<ItemRecetaDTO> items = req.items == null ? List.of() : req.items.stream()
            .filter(i -> i != null && i.medicamento != null && !i.medicamento.isBlank())
            .toList();
        if (items.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La receta debe tener al menos un medicamento.");
        }

        String itemsJson;
        try {
            itemsJson = objectMapper.writeValueAsString(items);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Medicamentos con formato invalido.");
        }

        Long id = jdbcTemplate.queryForObject(
            "INSERT INTO salud_odontologia_recetas (tenant_id, paciente_id, odontologo, diagnostico, items_json, indicaciones) " +
            "VALUES (?, ?, ?, ?, CAST(? AS jsonb), ?) RETURNING id",
            Long.class,
            tenantId, req.pacienteId, nombreOdontologo(req.odontologo), req.diagnostico, itemsJson, req.indicaciones);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", id, "mensaje", "Receta guardada en el expediente."));
    }

    // ==========================================
    // CONSENTIMIENTOS INFORMADOS
    // ==========================================

    public static class FirmarConsentimientoRequest {
        public Long pacienteId;
        public String tipo;
        public String titulo;
        public String texto;
        public Integer dienteFdi;
        public String firmanteNombre;
        public String firmanteIdentificacion;
        public String firmanteRelacion;
        public String firmaPng;
        public String odontologo;
    }

    // El listado no trae la imagen de la firma: se pide por id solo al ver o imprimir.
    @GetMapping("/consentimientos")
    public List<Map<String, Object>> listarConsentimientos(@RequestParam Long pacienteId) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        validarPacienteDelTenant(tenantId, pacienteId);
        return jdbcTemplate.queryForList(
            "SELECT id, tipo, titulo, diente_fdi, firmante_nombre, firmante_identificacion, firmante_relacion, " +
            "odontologo, fecha_firma FROM salud_odontologia_consentimientos " +
            "WHERE tenant_id = ? AND paciente_id = ? ORDER BY fecha_firma DESC, id DESC",
            tenantId, pacienteId);
    }

    @GetMapping("/consentimientos/{id}")
    public Map<String, Object> obtenerConsentimiento(@PathVariable Long id) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        List<Map<String, Object>> filas = jdbcTemplate.queryForList(
            "SELECT * FROM salud_odontologia_consentimientos WHERE tenant_id = ? AND id = ?", tenantId, id);
        if (filas.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Consentimiento no encontrado.");
        }
        return filas.get(0);
    }

    @PostMapping("/consentimientos")
    @Transactional
    public ResponseEntity<?> firmarConsentimiento(@RequestBody FirmarConsentimientoRequest req) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        validarPacienteDelTenant(tenantId, req.pacienteId);

        if (req.tipo == null || req.tipo.isBlank() || req.titulo == null || req.titulo.isBlank()
                || req.texto == null || req.texto.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo, titulo y texto del consentimiento son requeridos.");
        }
        if (req.firmanteNombre == null || req.firmanteNombre.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre de quien firma es requerido.");
        }
        if (req.firmaPng == null || !req.firmaPng.startsWith("data:image/png;base64,")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Falta la firma del paciente.");
        }
        if (req.firmaPng.length() > MAX_FIRMA_CHARS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La imagen de la firma es demasiado grande.");
        }
        String relacion = req.firmanteRelacion != null ? req.firmanteRelacion.trim().toUpperCase() : "PACIENTE";
        if (!RELACIONES_FIRMANTE.contains(relacion)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Relacion del firmante invalida.");
        }

        Long id = jdbcTemplate.queryForObject(
            "INSERT INTO salud_odontologia_consentimientos (tenant_id, paciente_id, tipo, titulo, texto, diente_fdi, " +
            "firmante_nombre, firmante_identificacion, firmante_relacion, firma_png, odontologo) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
            Long.class,
            tenantId, req.pacienteId, req.tipo.trim().toUpperCase(), req.titulo.trim(), req.texto, req.dienteFdi,
            req.firmanteNombre.trim(), req.firmanteIdentificacion, relacion, req.firmaPng, nombreOdontologo(req.odontologo));

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", id, "mensaje", "Consentimiento firmado y archivado."));
    }
}
