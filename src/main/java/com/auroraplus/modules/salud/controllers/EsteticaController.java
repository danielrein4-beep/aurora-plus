package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.repositories.PacienteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.*;

/**
 * Estetica y Cosmiatria. La clienta es un paciente de salud (misma agenda, servicios y caja que
 * MediClinic); aqui vive solo lo propio del rubro: ficha de piel, paquetes de sesiones, sesiones
 * con fotos de antes y despues, y consentimientos firmados.
 */
@RestController
@RequestMapping("/api/salud/estetica")
public class EsteticaController {

    // Un data-URI de ~6 MB es una foto de telefono de sobra; mas que eso es un error del cliente.
    private static final int MAX_FOTO_CHARS = 8_000_000;

    private static final Set<String> NIVELES = Set.of("BASICO", "DETALLADO");

    @Autowired
    private PacienteRepository pacienteRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private void validarPermisoClinico() {
        String rol = AuthContext.getRol();
        if (rol != null && !"DUENO_ADMIN".equalsIgnoreCase(rol) && !"MEDICO".equalsIgnoreCase(rol)
                && !"RECEPCIONISTA".equalsIgnoreCase(rol) && !"SUPER_ADMIN".equalsIgnoreCase(rol)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Acceso denegado: la ficha de la clienta es informacion confidencial.");
        }
    }

    private void validarPacienteDelTenant(Long tenantId, Long pacienteId) {
        if (pacienteId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Clienta requerida.");
        }
        pacienteRepository.findByTenantIdAndId(tenantId, pacienteId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Clienta no encontrada."));
    }

    private String nombreProfesional(String enviado) {
        if (enviado != null && !enviado.isBlank()) return enviado.trim();
        String usuario = AuthContext.getUsername();
        return usuario != null && !usuario.isBlank() ? usuario : "Profesional tratante";
    }

    private static String textoOpcional(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static void validarFoto(String foto, String cual) {
        if (foto == null || foto.isBlank()) return;
        if (!foto.startsWith("data:image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La foto de " + cual + " debe ser una imagen.");
        }
        if (foto.length() > MAX_FOTO_CHARS) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "La foto de " + cual + " es demasiado pesada.");
        }
    }

    // ==========================================
    // 1. FICHA DE PIEL
    // ==========================================

    @GetMapping("/ficha")
    public ResponseEntity<?> obtenerFicha(@RequestParam Long pacienteId) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        validarPacienteDelTenant(tenantId, pacienteId);

        List<Map<String, Object>> filas = jdbcTemplate.queryForList(
            "SELECT * FROM salud_estetica_ficha WHERE tenant_id = ? AND paciente_id = ?", tenantId, pacienteId);
        if (!filas.isEmpty()) return ResponseEntity.ok(filas.get(0));

        // Sin ficha todavia: se devuelve vacia (no inventada) para que la pantalla la llene.
        Map<String, Object> vacia = new HashMap<>();
        vacia.put("paciente_id", pacienteId);
        vacia.put("nivel", "BASICO");
        vacia.put("usa_isotretinoina", false);
        vacia.put("embarazo_lactancia", false);
        vacia.put("herpes_recurrente", false);
        vacia.put("marcapasos_implantes", false);
        vacia.put("derivar_dermatologo", false);
        vacia.put("nueva", true);
        return ResponseEntity.ok(vacia);
    }

    public static class GuardarFichaRequest {
        public Long pacienteId;
        public String nivel;
        public String fototipo;
        public String biotipo;
        public String sensibilidad;
        public String lesiones;
        public String zonasAfectadas;
        public String objetivo;
        public String rutinaDomiciliaria;
        public String exposicionSolar;
        public String medicacionActual;
        public String alergiasCosmeticos;
        public Boolean usaIsotretinoina;
        public Boolean embarazoLactancia;
        public Boolean herpesRecurrente;
        public Boolean marcapasosImplantes;
        public Boolean derivarDermatologo;
        public String observaciones;
    }

    @PutMapping("/ficha")
    @Transactional
    public ResponseEntity<?> guardarFicha(@RequestBody GuardarFichaRequest req) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        validarPacienteDelTenant(tenantId, req.pacienteId);
        String nivel = req.nivel != null && NIVELES.contains(req.nivel) ? req.nivel : "BASICO";

        jdbcTemplate.update(
            "INSERT INTO salud_estetica_ficha (tenant_id, paciente_id, nivel, fototipo, biotipo, sensibilidad, lesiones, " +
            "zonas_afectadas, objetivo, rutina_domiciliaria, exposicion_solar, medicacion_actual, alergias_cosmeticos, " +
            "usa_isotretinoina, embarazo_lactancia, herpes_recurrente, marcapasos_implantes, derivar_dermatologo, " +
            "observaciones, fecha_actualizacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now()) " +
            "ON CONFLICT (tenant_id, paciente_id) DO UPDATE SET nivel = EXCLUDED.nivel, fototipo = EXCLUDED.fototipo, " +
            "biotipo = EXCLUDED.biotipo, sensibilidad = EXCLUDED.sensibilidad, lesiones = EXCLUDED.lesiones, " +
            "zonas_afectadas = EXCLUDED.zonas_afectadas, objetivo = EXCLUDED.objetivo, " +
            "rutina_domiciliaria = EXCLUDED.rutina_domiciliaria, exposicion_solar = EXCLUDED.exposicion_solar, " +
            "medicacion_actual = EXCLUDED.medicacion_actual, alergias_cosmeticos = EXCLUDED.alergias_cosmeticos, " +
            "usa_isotretinoina = EXCLUDED.usa_isotretinoina, embarazo_lactancia = EXCLUDED.embarazo_lactancia, " +
            "herpes_recurrente = EXCLUDED.herpes_recurrente, marcapasos_implantes = EXCLUDED.marcapasos_implantes, " +
            "derivar_dermatologo = EXCLUDED.derivar_dermatologo, observaciones = EXCLUDED.observaciones, " +
            "fecha_actualizacion = now()",
            tenantId, req.pacienteId, nivel,
            textoOpcional(req.fototipo), textoOpcional(req.biotipo), textoOpcional(req.sensibilidad),
            textoOpcional(req.lesiones), textoOpcional(req.zonasAfectadas), textoOpcional(req.objetivo),
            textoOpcional(req.rutinaDomiciliaria), textoOpcional(req.exposicionSolar),
            textoOpcional(req.medicacionActual), textoOpcional(req.alergiasCosmeticos),
            Boolean.TRUE.equals(req.usaIsotretinoina), Boolean.TRUE.equals(req.embarazoLactancia),
            Boolean.TRUE.equals(req.herpesRecurrente), Boolean.TRUE.equals(req.marcapasosImplantes),
            Boolean.TRUE.equals(req.derivarDermatologo), textoOpcional(req.observaciones)
        );
        return ResponseEntity.ok(Map.of("mensaje", "Ficha guardada."));
    }

    // ==========================================
    // 2. PAQUETES DE SESIONES
    // ==========================================

    // Un paquete vencido se muestra como VENCIDO aunque nadie lo haya marcado.
    private static final String SELECT_PAQUETE =
        "SELECT p.id, p.paciente_id, p.nombre, p.sesiones_total, p.sesiones_usadas, p.precio, p.moneda, " +
        "p.fecha_compra, p.fecha_vencimiento, p.cobro_id, p.notas, " +
        "CASE WHEN p.estado = 'ACTIVO' AND p.fecha_vencimiento IS NOT NULL AND p.fecha_vencimiento < CURRENT_DATE " +
        "THEN 'VENCIDO' ELSE p.estado END AS estado, " +
        "pa.nombres || ' ' || pa.apellidos AS paciente_nombre, pa.telefono AS paciente_telefono " +
        "FROM salud_estetica_paquetes p JOIN salud_pacientes pa ON pa.id = p.paciente_id ";

    /** Con pacienteId: todos los paquetes de esa clienta. Sin el: los activos del negocio. */
    @GetMapping("/paquetes")
    public ResponseEntity<?> listarPaquetes(@RequestParam(required = false) Long pacienteId) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        if (pacienteId != null) {
            validarPacienteDelTenant(tenantId, pacienteId);
            return ResponseEntity.ok(jdbcTemplate.queryForList(
                SELECT_PAQUETE + "WHERE p.tenant_id = ? AND p.paciente_id = ? ORDER BY p.fecha_compra DESC, p.id DESC",
                tenantId, pacienteId));
        }
        return ResponseEntity.ok(jdbcTemplate.queryForList(
            SELECT_PAQUETE + "WHERE p.tenant_id = ? AND p.estado = 'ACTIVO' " +
            "AND (p.fecha_vencimiento IS NULL OR p.fecha_vencimiento >= CURRENT_DATE) " +
            "ORDER BY p.fecha_vencimiento NULLS LAST, p.id DESC",
            tenantId));
    }

    public static class CrearPaqueteRequest {
        public Long pacienteId;
        public String nombre;
        public Integer sesionesTotal;
        public BigDecimal precio;
        public String moneda;
        public String fechaVencimiento;
        public Long cobroId;
        public String notas;
    }

    @PostMapping("/paquetes")
    @Transactional
    public ResponseEntity<?> crearPaquete(@RequestBody CrearPaqueteRequest req) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        validarPacienteDelTenant(tenantId, req.pacienteId);
        if (req.nombre == null || req.nombre.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre del paquete es obligatorio.");
        }
        if (req.sesionesTotal == null || req.sesionesTotal < 1 || req.sesionesTotal > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El paquete debe tener entre 1 y 200 sesiones.");
        }
        BigDecimal precio = req.precio != null ? req.precio : BigDecimal.ZERO;
        if (precio.signum() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El precio no puede ser negativo.");
        }
        String moneda = req.moneda != null && !req.moneda.isBlank() ? req.moneda.trim().toUpperCase() : "USD";

        Long id = jdbcTemplate.queryForObject(
            "INSERT INTO salud_estetica_paquetes (tenant_id, paciente_id, nombre, sesiones_total, precio, moneda, " +
            "fecha_vencimiento, cobro_id, notas) VALUES (?, ?, ?, ?, ?, ?, ?::date, ?, ?) RETURNING id",
            Long.class,
            tenantId, req.pacienteId, req.nombre.trim(), req.sesionesTotal, precio, moneda,
            textoOpcional(req.fechaVencimiento), req.cobroId, textoOpcional(req.notas));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", id, "mensaje", "Paquete registrado."));
    }

    @PatchMapping("/paquetes/{id}/cobro")
    @Transactional
    public ResponseEntity<?> vincularCobro(@PathVariable Long id, @RequestParam Long cobroId) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        Integer cobros = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM salud_cobros_consulta WHERE tenant_id = ? AND id = ?", Integer.class, tenantId, cobroId);
        if (cobros == null || cobros == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cobro no encontrado.");
        int n = jdbcTemplate.update(
            "UPDATE salud_estetica_paquetes SET cobro_id = ? WHERE tenant_id = ? AND id = ?", cobroId, tenantId, id);
        if (n == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Paquete no encontrado.");
        return ResponseEntity.ok(Map.of("id", id, "cobroId", cobroId));
    }

    @PatchMapping("/paquetes/{id}/anular")
    @Transactional
    public ResponseEntity<?> anularPaquete(@PathVariable Long id) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        int n = jdbcTemplate.update(
            "UPDATE salud_estetica_paquetes SET estado = 'ANULADO' WHERE tenant_id = ? AND id = ? AND estado <> 'ANULADO'",
            tenantId, id);
        if (n == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Paquete no encontrado o ya anulado.");
        return ResponseEntity.ok(Map.of("id", id, "estado", "ANULADO"));
    }

    // ==========================================
    // 3. SESIONES CON FOTOS DE ANTES Y DESPUES
    // ==========================================

    @GetMapping("/sesiones")
    public ResponseEntity<?> listarSesiones(@RequestParam Long pacienteId) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        validarPacienteDelTenant(tenantId, pacienteId);
        // Sin las fotos: cada una pesa megas. Solo se avisa si existen y se piden al abrir la sesion.
        return ResponseEntity.ok(jdbcTemplate.queryForList(
            "SELECT s.id, s.paciente_id, s.paquete_id, s.fecha_sesion, s.servicio, s.zona, s.parametros, s.productos, " +
            "s.reaccion, s.indicaciones, s.proxima_sesion, s.profesional, s.fecha_registro, " +
            "(s.foto_antes IS NOT NULL) AS tiene_foto_antes, (s.foto_despues IS NOT NULL) AS tiene_foto_despues, " +
            "p.nombre AS paquete_nombre " +
            "FROM salud_estetica_sesiones s LEFT JOIN salud_estetica_paquetes p ON p.id = s.paquete_id " +
            "WHERE s.tenant_id = ? AND s.paciente_id = ? ORDER BY s.fecha_sesion DESC, s.id DESC",
            tenantId, pacienteId));
    }

    @GetMapping("/sesiones/{id}/fotos")
    public ResponseEntity<?> fotosSesion(@PathVariable Long id) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        List<Map<String, Object>> filas = jdbcTemplate.queryForList(
            "SELECT foto_antes, foto_despues FROM salud_estetica_sesiones WHERE tenant_id = ? AND id = ?", tenantId, id);
        if (filas.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sesion no encontrada.");
        Map<String, Object> r = new HashMap<>();
        r.put("antes", filas.get(0).get("foto_antes"));
        r.put("despues", filas.get(0).get("foto_despues"));
        return ResponseEntity.ok(r);
    }

    public static class RegistrarSesionRequest {
        public Long pacienteId;
        public Long paqueteId;
        public String fechaSesion;
        public String servicio;
        public String zona;
        public String parametros;
        public String productos;
        public String reaccion;
        public String indicaciones;
        public String proximaSesion;
        public String profesional;
        public String fotoAntes;
        public String fotoDespues;
    }

    @PostMapping("/sesiones")
    @Transactional
    public ResponseEntity<?> registrarSesion(@RequestBody RegistrarSesionRequest req) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        validarPacienteDelTenant(tenantId, req.pacienteId);
        if (req.servicio == null || req.servicio.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indica el servicio realizado.");
        }
        validarFoto(req.fotoAntes, "antes");
        validarFoto(req.fotoDespues, "despues");

        // Descontar del paquete en una sola sentencia: si no le quedan sesiones, esta vencido o es
        // de otra clienta, no se actualiza ninguna fila y la sesion no se registra.
        if (req.paqueteId != null) {
            int n = jdbcTemplate.update(
                "UPDATE salud_estetica_paquetes SET sesiones_usadas = sesiones_usadas + 1, " +
                "estado = CASE WHEN sesiones_usadas + 1 >= sesiones_total THEN 'AGOTADO' ELSE estado END " +
                "WHERE tenant_id = ? AND id = ? AND paciente_id = ? AND estado = 'ACTIVO' " +
                "AND sesiones_usadas < sesiones_total " +
                "AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURRENT_DATE)",
                tenantId, req.paqueteId, req.pacienteId);
            if (n == 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El paquete no tiene sesiones disponibles (agotado, vencido o anulado).");
            }
        }

        Long id = jdbcTemplate.queryForObject(
            "INSERT INTO salud_estetica_sesiones (tenant_id, paciente_id, paquete_id, fecha_sesion, servicio, zona, " +
            "parametros, productos, reaccion, indicaciones, proxima_sesion, profesional, foto_antes, foto_despues) " +
            "VALUES (?, ?, ?, COALESCE(?::date, CURRENT_DATE), ?, ?, ?, ?, ?, ?, ?::date, ?, ?, ?) RETURNING id",
            Long.class,
            tenantId, req.pacienteId, req.paqueteId, textoOpcional(req.fechaSesion), req.servicio.trim(),
            textoOpcional(req.zona), textoOpcional(req.parametros), textoOpcional(req.productos),
            textoOpcional(req.reaccion), textoOpcional(req.indicaciones), textoOpcional(req.proximaSesion),
            nombreProfesional(req.profesional), textoOpcional(req.fotoAntes), textoOpcional(req.fotoDespues));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", id, "mensaje", "Sesion registrada."));
    }

    /** Borra una sesion cargada por error y, si descontaba de un paquete, le devuelve la sesion. */
    @DeleteMapping("/sesiones/{id}")
    @Transactional
    public ResponseEntity<?> eliminarSesion(@PathVariable Long id) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        List<Long> paquete = jdbcTemplate.queryForList(
            "DELETE FROM salud_estetica_sesiones WHERE tenant_id = ? AND id = ? RETURNING paquete_id",
            Long.class, tenantId, id);
        if (paquete.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sesion no encontrada.");
        if (paquete.get(0) != null) {
            jdbcTemplate.update(
                "UPDATE salud_estetica_paquetes SET sesiones_usadas = GREATEST(sesiones_usadas - 1, 0), " +
                "estado = CASE WHEN estado = 'AGOTADO' THEN 'ACTIVO' ELSE estado END " +
                "WHERE tenant_id = ? AND id = ?",
                tenantId, paquete.get(0));
        }
        return ResponseEntity.ok(Map.of("id", id, "mensaje", "Sesion eliminada."));
    }

    // ==========================================
    // 4. CONSENTIMIENTOS FIRMADOS
    // ==========================================

    @GetMapping("/consentimientos")
    public ResponseEntity<?> listarConsentimientos(@RequestParam Long pacienteId) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        validarPacienteDelTenant(tenantId, pacienteId);
        return ResponseEntity.ok(jdbcTemplate.queryForList(
            "SELECT id, paciente_id, procedimiento, nombre_firmante, identificacion_firmante, profesional, fecha_firma " +
            "FROM salud_estetica_consentimientos WHERE tenant_id = ? AND paciente_id = ? ORDER BY fecha_firma DESC",
            tenantId, pacienteId));
    }

    @GetMapping("/consentimientos/{id}")
    public ResponseEntity<?> obtenerConsentimiento(@PathVariable Long id) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        List<Map<String, Object>> filas = jdbcTemplate.queryForList(
            "SELECT * FROM salud_estetica_consentimientos WHERE tenant_id = ? AND id = ?", tenantId, id);
        if (filas.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Consentimiento no encontrado.");
        return ResponseEntity.ok(filas.get(0));
    }

    public static class FirmarConsentimientoRequest {
        public Long pacienteId;
        public String procedimiento;
        public String texto;
        public String nombreFirmante;
        public String identificacionFirmante;
        public String firma;
        public String profesional;
    }

    @PostMapping("/consentimientos")
    @Transactional
    public ResponseEntity<?> firmarConsentimiento(@RequestBody FirmarConsentimientoRequest req) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        validarPacienteDelTenant(tenantId, req.pacienteId);
        if (req.procedimiento == null || req.procedimiento.isBlank() || req.texto == null || req.texto.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Procedimiento y texto del consentimiento son obligatorios.");
        }
        if (req.nombreFirmante == null || req.nombreFirmante.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Falta el nombre de quien firma.");
        }
        if (req.firma == null || !req.firma.startsWith("data:image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Falta la firma de la clienta.");
        }
        validarFoto(req.firma, "la firma");

        Long id = jdbcTemplate.queryForObject(
            "INSERT INTO salud_estetica_consentimientos (tenant_id, paciente_id, procedimiento, texto, nombre_firmante, " +
            "identificacion_firmante, firma, profesional) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
            Long.class,
            tenantId, req.pacienteId, req.procedimiento.trim(), req.texto, req.nombreFirmante.trim(),
            textoOpcional(req.identificacionFirmante), req.firma, nombreProfesional(req.profesional));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", id, "mensaje", "Consentimiento firmado."));
    }

    // ==========================================
    // 5. RESUMEN PARA LA VISTA GENERAL
    // ==========================================

    @GetMapping("/resumen")
    public ResponseEntity<?> resumen() {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        Map<String, Object> r = new HashMap<>();
        r.putAll(jdbcTemplate.queryForMap(
            "SELECT COUNT(*) AS paquetes_activos, COALESCE(SUM(sesiones_total - sesiones_usadas), 0) AS sesiones_pendientes, " +
            "COUNT(*) FILTER (WHERE fecha_vencimiento IS NOT NULL AND fecha_vencimiento <= CURRENT_DATE + 15) AS paquetes_por_vencer " +
            "FROM salud_estetica_paquetes WHERE tenant_id = ? AND estado = 'ACTIVO' " +
            "AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURRENT_DATE)",
            tenantId));
        r.put("sesiones_mes", jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM salud_estetica_sesiones WHERE tenant_id = ? " +
            "AND fecha_sesion >= date_trunc('month', CURRENT_DATE)", Long.class, tenantId));
        r.put("derivaciones", jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM salud_estetica_ficha WHERE tenant_id = ? AND derivar_dermatologo = true",
            Long.class, tenantId));
        r.put("proximas_sesiones", jdbcTemplate.queryForList(
            "SELECT DISTINCT ON (s.paciente_id) s.paciente_id, s.proxima_sesion, s.servicio, " +
            "pa.nombres || ' ' || pa.apellidos AS paciente_nombre, pa.telefono AS paciente_telefono " +
            "FROM salud_estetica_sesiones s JOIN salud_pacientes pa ON pa.id = s.paciente_id " +
            "WHERE s.tenant_id = ? AND s.proxima_sesion IS NOT NULL " +
            "AND s.proxima_sesion BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 " +
            "ORDER BY s.paciente_id, s.proxima_sesion",
            tenantId));
        return ResponseEntity.ok(r);
    }
}
