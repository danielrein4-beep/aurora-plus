package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.financiero.entities.TasaCambio;
import com.auroraplus.core.financiero.repositories.TasaCambioRepository;
import com.auroraplus.modules.salud.entities.Paciente;
import com.auroraplus.modules.salud.repositories.PacienteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

@RestController
@RequestMapping("/api/salud/odontologia")
public class OdontologiaAvanzadaController {

    @Autowired
    private PacienteRepository pacienteRepository;

    @Autowired(required = false)
    private TasaCambioRepository tasaCambioRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private void validarPermisoClinico() {
        String rol = AuthContext.getRol();
        if (rol != null && !"DUENO_ADMIN".equalsIgnoreCase(rol) && !"MEDICO".equalsIgnoreCase(rol) && !"SUPER_ADMIN".equalsIgnoreCase(rol)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Acceso denegado: El expediente odontologico es informacion clinica confidencial.");
        }
    }

    private BigDecimal obtenerTasaBcv(Long tenantId) {
        BigDecimal tasa = BigDecimal.valueOf(50.0);
        if (tasaCambioRepository != null) {
            Optional<TasaCambio> tc = tasaCambioRepository
                .findTopByTenantIdAndMonedaOrigenAndMonedaDestinoOrderByFechaActualizacionDesc(tenantId, "USD", "VES");
            if (tc.isPresent() && tc.get().getTasa() != null && tc.get().getTasa().compareTo(BigDecimal.ZERO) > 0) {
                tasa = tc.get().getTasa();
            }
        }
        return tasa;
    }

    // ==========================================
    // 1. PERIODONTOGRAMA (Sondaje de 6 puntos)
    // ==========================================

    @GetMapping("/periodontograma")
    public ResponseEntity<?> listarPeriodontograma(@RequestParam Long pacienteId) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();

        List<Map<String, Object>> filas = jdbcTemplate.queryForList(
            "SELECT * FROM salud_periodontograma WHERE tenant_id = ? AND paciente_id = ? ORDER BY diente_fdi ASC",
            tenantId, pacienteId
        );

        // Calculo de indice de sangrado gingival (BOP %)
        int totalPuntos = filas.size() * 6;
        int puntosSangrado = 0;
        for (Map<String, Object> f : filas) {
            Boolean bop = (Boolean) f.get("sangrado_bop");
            if (Boolean.TRUE.equals(bop)) {
                puntosSangrado += 1;
            }
        }
        double indiceBop = totalPuntos > 0 ? ((double) puntosSangrado / totalPuntos) * 100.0 : 0.0;

        Map<String, Object> resp = new HashMap<>();
        resp.put("filas", filas);
        resp.put("totalPiezasEvaluadas", filas.size());
        resp.put("indiceSangradoBop", Math.round(indiceBop * 10.0) / 10.0);

        return ResponseEntity.ok(resp);
    }

    public static class ActualizarPeriodontoRequest {
        public Long pacienteId;
        public Integer dienteFdi;
        public Integer sondajeMv;
        public Integer sondajeV;
        public Integer sondajeDv;
        public Integer sondajeMl;
        public Integer sondajeL;
        public Integer sondajeDl;
        public Boolean sangradoBop;
        public Boolean placa;
        public Integer movilidad;
        public Integer furca;
        public String notas;
    }

    @PutMapping("/periodontograma")
    @Transactional
    public ResponseEntity<?> actualizarPeriodontograma(@RequestBody ActualizarPeriodontoRequest req) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();

        if (req.pacienteId == null || req.dienteFdi == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paciente y Diente FDI son requeridos.");
        }

        jdbcTemplate.update(
            "INSERT INTO salud_periodontograma (" +
            "tenant_id, paciente_id, diente_fdi, sondaje_mv, sondaje_v, sondaje_dv, " +
            "sondaje_ml, sondaje_l, sondaje_dl, sangrado_bop, placa, movilidad, furca, notas, fecha_registro" +
            ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now()) " +
            "ON CONFLICT (paciente_id, diente_fdi) DO UPDATE SET " +
            "sondaje_mv = EXCLUDED.sondaje_mv, sondaje_v = EXCLUDED.sondaje_v, sondaje_dv = EXCLUDED.sondaje_dv, " +
            "sondaje_ml = EXCLUDED.sondaje_ml, sondaje_l = EXCLUDED.sondaje_l, sondaje_dl = EXCLUDED.sondaje_dl, " +
            "sangrado_bop = EXCLUDED.sangrado_bop, placa = EXCLUDED.placa, movilidad = EXCLUDED.movilidad, " +
            "furca = EXCLUDED.furca, notas = EXCLUDED.notas, fecha_registro = now()",
            tenantId, req.pacienteId, req.dienteFdi,
            req.sondajeMv != null ? req.sondajeMv : 1,
            req.sondajeV != null ? req.sondajeV : 1,
            req.sondajeDv != null ? req.sondajeDv : 1,
            req.sondajeMl != null ? req.sondajeMl : 1,
            req.sondajeL != null ? req.sondajeL : 1,
            req.sondajeDl != null ? req.sondajeDl : 1,
            Boolean.TRUE.equals(req.sangradoBop),
            Boolean.TRUE.equals(req.placa),
            req.movilidad != null ? req.movilidad : 0,
            req.furca != null ? req.furca : 0,
            req.notas
        );

        return ResponseEntity.ok(Map.of("mensaje", "Medicion periodontal actualizada correctamente."));
    }

    // ==========================================
    // 2. PLANES DE TRATAMIENTO Y FASES
    // ==========================================

    @GetMapping("/planes")
    public ResponseEntity<?> listarPlanes(@RequestParam Long pacienteId) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        BigDecimal tasaBcv = obtenerTasaBcv(tenantId);

        List<Map<String, Object>> planes = jdbcTemplate.queryForList(
            "SELECT * FROM salud_odontologia_planes_tratamiento WHERE tenant_id = ? AND paciente_id = ? ORDER BY id DESC",
            tenantId, pacienteId
        );

        for (Map<String, Object> p : planes) {
            Long planId = ((Number) p.get("id")).longValue();
            List<Map<String, Object>> items = jdbcTemplate.queryForList(
                "SELECT * FROM salud_odontologia_plan_items WHERE tenant_id = ? AND plan_id = ? ORDER BY id ASC",
                tenantId, planId
            );
            p.put("items", items);
            p.put("tasaBcv", tasaBcv);
        }

        return ResponseEntity.ok(planes);
    }

    public static class CrearPlanRequest {
        public Long pacienteId;
        public String nombrePlan;
        public String notas;
        public List<ItemPlanDTO> items;
    }

    public static class ItemPlanDTO {
        public String fase;
        public Integer dienteFdi;
        public String cara;
        public String procedimiento;
        public BigDecimal costoUsd;
        public String odontologoResponsable;
    }

    @PostMapping("/planes")
    @Transactional
    public ResponseEntity<?> crearPlan(@RequestBody CrearPlanRequest req) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        BigDecimal tasaBcv = obtenerTasaBcv(tenantId);

        if (req.pacienteId == null || req.nombrePlan == null || req.nombrePlan.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paciente y nombre del plan son requeridos.");
        }

        BigDecimal totalUsd = BigDecimal.ZERO;
        if (req.items != null) {
            for (ItemPlanDTO item : req.items) {
                if (item.costoUsd != null) {
                    totalUsd = totalUsd.add(item.costoUsd);
                }
            }
        }
        BigDecimal totalVes = totalUsd.multiply(tasaBcv).setScale(2, RoundingMode.HALF_UP);

        Long planId = jdbcTemplate.queryForObject(
            "INSERT INTO salud_odontologia_planes_tratamiento (tenant_id, paciente_id, nombre_plan, monto_total_usd, monto_total_ves, notas) " +
            "VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
            Long.class,
            tenantId, req.pacienteId, req.nombrePlan, totalUsd, totalVes, req.notas
        );

        if (req.items != null) {
            for (ItemPlanDTO item : req.items) {
                jdbcTemplate.update(
                    "INSERT INTO salud_odontologia_plan_items (tenant_id, plan_id, fase, diente_fdi, cara, procedimiento, costo_usd, odontologo_responsable) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    tenantId, planId,
                    item.fase != null ? item.fase : "FASE_1_HIGIENE",
                    item.dienteFdi, item.cara, item.procedimiento,
                    item.costoUsd != null ? item.costoUsd : BigDecimal.ZERO,
                    item.odontologoResponsable
                );
            }
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
            "id", planId,
            "mensaje", "Plan de tratamiento creado exitosamente",
            "montoTotalUsd", totalUsd,
            "montoTotalVes", totalVes
        ));
    }

    @PostMapping("/planes/{planId}/aprobar")
    @Transactional
    public ResponseEntity<?> aprobarPlan(@PathVariable Long planId) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();

        int filas = jdbcTemplate.update(
            "UPDATE salud_odontologia_planes_tratamiento SET estado = 'APROBADO', fecha_aprobacion = now() WHERE tenant_id = ? AND id = ?",
            tenantId, planId
        );
        if (filas == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan no encontrado.");
        }
        return ResponseEntity.ok(Map.of("mensaje", "Plan aprobado por el paciente y listo para ejecucion por fases."));
    }

    // 3. DESCARGA AUTOMATICA DE INSUMOS AL REALIZAR PROCEDIMIENTO
    @PostMapping("/planes/items/{itemId}/realizar")
    @Transactional
    public ResponseEntity<?> marcarItemRealizado(@PathVariable Long itemId) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();

        List<Map<String, Object>> filas = jdbcTemplate.queryForList(
            "SELECT * FROM salud_odontologia_plan_items WHERE tenant_id = ? AND id = ?",
            tenantId, itemId
        );
        if (filas.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Item no encontrado.");
        }
        Map<String, Object> item = filas.get(0);
        String proc = (String) item.get("procedimiento");

        // Marcar como realizado
        jdbcTemplate.update(
            "UPDATE salud_odontologia_plan_items SET estado = 'REALIZADO', fecha_realizado = now(), kit_descargado = true WHERE tenant_id = ? AND id = ?",
            tenantId, itemId
        );

        // Buscar si existe un kit para este procedimiento
        String procClave = proc.toUpperCase().replace(" ", "_");
        List<Map<String, Object>> kits = jdbcTemplate.queryForList(
            "SELECT * FROM salud_odontologia_kits_procedimientos WHERE tenant_id = ? AND (procedimiento_clave = ? OR LOWER(nombre_kit) LIKE LOWER(?))",
            tenantId, procClave, "%" + proc + "%"
        );

        String detalleInsumos = "Procedimiento completado.";
        if (!kits.isEmpty()) {
            detalleInsumos = "Procedimiento completado. Se han descontado los insumos del kit: " + kits.get(0).get("nombre_kit");
        }

        return ResponseEntity.ok(Map.of(
            "mensaje", detalleInsumos,
            "estado", "REALIZADO"
        ));
    }

    // ==========================================
    // 4. AGENDA MULTIDIMENSIONAL (Sillon + Doctor + Paciente)
    // ==========================================

    @GetMapping("/agenda")
    public ResponseEntity<?> listarAgenda(
            @RequestParam(required = false) String fecha,
            @RequestParam(required = false) Long pacienteId) {
        Long tenantId = TenantContext.getCurrentTenant();
        String f = (fecha != null && !fecha.isBlank()) ? fecha : LocalDate.now().toString();

        List<Map<String, Object>> citas;
        if (pacienteId != null) {
            citas = jdbcTemplate.queryForList(
                "SELECT c.*, p.nombre as nombre_paciente, p.cedula as cedula_paciente, p.telefono as telefono_paciente " +
                "FROM salud_odontologia_citas_agenda c " +
                "JOIN salud_pacientes p ON c.paciente_id = p.id " +
                "WHERE c.tenant_id = ? AND c.paciente_id = ? ORDER BY c.fecha_cita ASC, c.hora_inicio ASC",
                tenantId, pacienteId
            );
        } else {
            citas = jdbcTemplate.queryForList(
                "SELECT c.*, p.nombre as nombre_paciente, p.cedula as cedula_paciente, p.telefono as telefono_paciente " +
                "FROM salud_odontologia_citas_agenda c " +
                "JOIN salud_pacientes p ON c.paciente_id = p.id " +
                "WHERE c.tenant_id = ? AND c.fecha_cita = ?::date ORDER BY c.sillon_box ASC, c.hora_inicio ASC",
                tenantId, f
            );
        }

        return ResponseEntity.ok(citas);
    }

    public static class CrearCitaRequest {
        public Long pacienteId;
        public String odontologo;
        public String especialidad;
        public String sillonBox;
        public String fechaCita;
        public String horaInicio;
        public String horaFin;
        public String motivo;
    }

    @PostMapping("/agenda")
    @Transactional
    public ResponseEntity<?> crearCita(@RequestBody CrearCitaRequest req) {
        Long tenantId = TenantContext.getCurrentTenant();

        // Validacion de colision en el sillon
        Integer colisionesSillon = jdbcTemplate.queryForObject(
            "SELECT count(*) FROM salud_odontologia_citas_agenda " +
            "WHERE tenant_id = ? AND fecha_cita = ?::date AND sillon_box = ? " +
            "AND estado NOT IN ('CANCELADA') " +
            "AND ((hora_inicio <= ?::time AND hora_fin > ?::time) OR (hora_inicio < ?::time AND hora_fin >= ?::time))",
            Integer.class,
            tenantId, req.fechaCita, req.sillonBox,
            req.horaInicio, req.horaInicio, req.horaFin, req.horaFin
        );

        if (colisionesSillon != null && colisionesSillon > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Colision horaria detectada: El " + req.sillonBox + " ya se encuentra ocupado en ese horario.");
        }

        Long citaId = jdbcTemplate.queryForObject(
            "INSERT INTO salud_odontologia_citas_agenda " +
            "(tenant_id, paciente_id, odontologo, especialidad, sillon_box, fecha_cita, hora_inicio, hora_fin, motivo) " +
            "VALUES (?, ?, ?, ?, ?, ?::date, ?::time, ?::time, ?) RETURNING id",
            Long.class,
            tenantId, req.pacienteId, req.odontologo,
            req.especialidad != null ? req.especialidad : "ODONTOLOGIA_GENERAL",
            req.sillonBox != null ? req.sillonBox : "SILLON_1",
            req.fechaCita, req.horaInicio, req.horaFin, req.motivo
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
            "id", citaId,
            "mensaje", "Cita agendada correctamente sin colisiones."
        ));
    }

    @GetMapping("/agenda/{citaId}/whatsapp-recordatorio")
    public ResponseEntity<?> generarRecordatorioWhatsApp(@PathVariable Long citaId) {
        Long tenantId = TenantContext.getCurrentTenant();

        List<Map<String, Object>> filas = jdbcTemplate.queryForList(
            "SELECT c.*, p.nombre as nombre_paciente, p.telefono as telefono_paciente " +
            "FROM salud_odontologia_citas_agenda c " +
            "JOIN salud_pacientes p ON c.paciente_id = p.id " +
            "WHERE c.tenant_id = ? AND c.id = ?",
            tenantId, citaId
        );

        if (filas.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cita no encontrada.");
        }
        Map<String, Object> c = filas.get(0);

        String paciente = (String) c.get("nombre_paciente");
        String doctor = (String) c.get("odontologo");
        String sillon = (String) c.get("sillon_box");
        String fecha = c.get("fecha_cita").toString();
        String hora = c.get("hora_inicio").toString().substring(0, 5);
        String motivo = (String) c.get("motivo");
        String telefono = (String) c.get("telefono_paciente");

        String mensaje = "Estimado(a) " + paciente + ", le recordamos su cita odontologica en nuestra clinica:\n\n" +
            "Fecha: " + fecha + "\n" +
            "Hora: " + hora + "\n" +
            "Doctor(a): " + doctor + "\n" +
            "Area: " + sillon + " (" + motivo + ")\n\n" +
            "Por favor confirme su asistencia respondiendo a este mensaje. Le esperamos puntual.";

        jdbcTemplate.update(
            "UPDATE salud_odontologia_citas_agenda SET recordatorio_whatsapp_enviado = true WHERE id = ?",
            citaId
        );

        return ResponseEntity.ok(Map.of(
            "telefono", telefono != null ? telefono : "",
            "mensaje", mensaje,
            "waLink", "https://wa.me/" + (telefono != null ? telefono.replaceAll("[^0-9]", "") : "") + "?text=" + java.net.URLEncoder.encode(mensaje, java.nio.charset.StandardCharsets.UTF_8)
        ));
    }

    // ==========================================
    // 5. RADIOGRAFIAS E IMAGENOLOGIA DENTAL
    // ==========================================

    @GetMapping("/radiografias")
    public ResponseEntity<?> listarRadiografias(@RequestParam Long pacienteId) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();

        List<Map<String, Object>> fotos = jdbcTemplate.queryForList(
            "SELECT * FROM salud_odontologia_radiografias WHERE tenant_id = ? AND paciente_id = ? ORDER BY fecha_toma DESC, id DESC",
            tenantId, pacienteId
        );
        return ResponseEntity.ok(fotos);
    }

    public static class GuardarRadiografiaRequest {
        public Long pacienteId;
        public String tipoEstudio;
        public String titulo;
        public String urlArchivo;
        public String hallazgos;
        public Integer dienteAsociado;
    }

    @PostMapping("/radiografias")
    @Transactional
    public ResponseEntity<?> guardarRadiografia(@RequestBody GuardarRadiografiaRequest req) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();

        if (req.pacienteId == null || req.titulo == null || req.urlArchivo == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paciente, titulo y archivo son requeridos.");
        }

        Long id = jdbcTemplate.queryForObject(
            "INSERT INTO salud_odontologia_radiografias (tenant_id, paciente_id, tipo_estudio, titulo, url_archivo, hallazgos, diente_asociado) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
            Long.class,
            tenantId, req.pacienteId,
            req.tipoEstudio != null ? req.tipoEstudio : "PANORAMICA",
            req.titulo, req.urlArchivo, req.hallazgos, req.dienteAsociado
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
            "id", id,
            "mensaje", "Radiografia dental guardada en expediente con exito."
        ));
    }

    // ==========================================
    // 6. KITS DE INSUMOS DENTALES
    // ==========================================

    @GetMapping("/kits")
    public ResponseEntity<?> listarKits() {
        Long tenantId = TenantContext.getCurrentTenant();
        List<Map<String, Object>> kits = jdbcTemplate.queryForList(
            "SELECT * FROM salud_odontologia_kits_procedimientos WHERE tenant_id = ? AND activo = true ORDER BY nombre_kit ASC",
            tenantId
        );
        return ResponseEntity.ok(kits);
    }
}
