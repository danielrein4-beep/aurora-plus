package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.core.inventario.entities.Kardex;
import com.auroraplus.core.inventario.repositories.ArticuloRepository;
import com.auroraplus.core.inventario.services.InventarioService;
import com.auroraplus.modules.salud.entities.CobroConsulta;
import com.auroraplus.modules.salud.entities.Paciente;
import com.auroraplus.modules.salud.repositories.PacienteRepository;
import com.auroraplus.modules.salud.services.SaludFinanzasService;
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

    @Autowired
    private ArticuloRepository articuloRepository;

    @Autowired
    private InventarioService inventarioService;

    @Autowired
    private SaludFinanzasService saludFinanzasService;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

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
            "s.reaccion, s.indicaciones, s.proxima_sesion, s.profesional, s.profesional_id, s.valor, s.moneda, s.fecha_registro, " +
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
        public Long profesionalId;
        public BigDecimal valor;
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

        String profesional = req.profesionalId != null
            ? nombreProfesionalActivo(tenantId, req.profesionalId)
            : nombreProfesional(req.profesional);

        // Valor de la sesion para la comision: el que se indique o, si sale de un paquete, su precio
        // entre sus sesiones. Una sesion suelta sin valor no genera comision.
        BigDecimal valor = req.valor;
        String moneda = "USD";
        if (valor != null && valor.signum() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El valor de la sesion no puede ser negativo.");
        }
        if (req.paqueteId != null) {
            Map<String, Object> paq = jdbcTemplate.queryForMap(
                "SELECT precio, sesiones_total, moneda FROM salud_estetica_paquetes WHERE tenant_id = ? AND id = ?",
                tenantId, req.paqueteId);
            moneda = (String) paq.get("moneda");
            if (valor == null) {
                valor = ((BigDecimal) paq.get("precio"))
                    .divide(BigDecimal.valueOf(((Number) paq.get("sesiones_total")).longValue()), 2, java.math.RoundingMode.HALF_UP);
            }
        }

        Long id = jdbcTemplate.queryForObject(
            "INSERT INTO salud_estetica_sesiones (tenant_id, paciente_id, paquete_id, fecha_sesion, servicio, zona, " +
            "parametros, productos, reaccion, indicaciones, proxima_sesion, profesional, foto_antes, foto_despues, " +
            "profesional_id, valor, moneda) " +
            "VALUES (?, ?, ?, COALESCE(?::date, CURRENT_DATE), ?, ?, ?, ?, ?, ?, ?::date, ?, ?, ?, ?, ?, ?) RETURNING id",
            Long.class,
            tenantId, req.pacienteId, req.paqueteId, textoOpcional(req.fechaSesion), req.servicio.trim(),
            textoOpcional(req.zona), textoOpcional(req.parametros), textoOpcional(req.productos),
            textoOpcional(req.reaccion), textoOpcional(req.indicaciones), textoOpcional(req.proximaSesion),
            profesional, textoOpcional(req.fotoAntes), textoOpcional(req.fotoDespues),
            req.profesionalId, valor, moneda);
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

    // ==========================================
    // 6. PROFESIONALES Y COMISIONES
    // ==========================================

    private String nombreProfesionalActivo(Long tenantId, Long profesionalId) {
        List<String> n = jdbcTemplate.queryForList(
            "SELECT nombre FROM salud_estetica_profesionales WHERE tenant_id = ? AND id = ? AND activo = true",
            String.class, tenantId, profesionalId);
        if (n.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La profesional elegida no existe o esta inactiva.");
        return n.get(0);
    }

    // Solo el dueno (o el titular, que en salud entra como MEDICO) define porcentajes.
    private void validarPermisoDueno() {
        String rol = AuthContext.getRol();
        if (rol != null && !"DUENO_ADMIN".equalsIgnoreCase(rol) && !"MEDICO".equalsIgnoreCase(rol) && !"SUPER_ADMIN".equalsIgnoreCase(rol)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo la titular del centro puede hacer esto.");
        }
    }

    private static BigDecimal porcentaje(BigDecimal p) {
        if (p == null) return BigDecimal.ZERO;
        if (p.signum() < 0 || p.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La comision debe estar entre 0 y 100%.");
        }
        return p;
    }

    @GetMapping("/profesionales")
    public ResponseEntity<?> listarProfesionales() {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.ok(jdbcTemplate.queryForList(
            "SELECT id, nombre, telefono, comision_servicios, comision_productos, activo FROM salud_estetica_profesionales " +
            "WHERE tenant_id = ? ORDER BY activo DESC, nombre", tenantId));
    }

    public static class ProfesionalRequest {
        public String nombre;
        public String telefono;
        public BigDecimal comisionServicios;
        public BigDecimal comisionProductos;
        public Boolean activo;
    }

    @PostMapping("/profesionales")
    @Transactional
    public ResponseEntity<?> crearProfesional(@RequestBody ProfesionalRequest req) {
        validarPermisoDueno();
        Long tenantId = TenantContext.getCurrentTenant();
        if (req.nombre == null || req.nombre.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre es obligatorio.");
        }
        Long id = jdbcTemplate.queryForObject(
            "INSERT INTO salud_estetica_profesionales (tenant_id, nombre, telefono, comision_servicios, comision_productos) " +
            "VALUES (?, ?, ?, ?, ?) RETURNING id", Long.class,
            tenantId, req.nombre.trim(), textoOpcional(req.telefono), porcentaje(req.comisionServicios), porcentaje(req.comisionProductos));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", id));
    }

    @PutMapping("/profesionales/{id}")
    @Transactional
    public ResponseEntity<?> actualizarProfesional(@PathVariable Long id, @RequestBody ProfesionalRequest req) {
        validarPermisoDueno();
        Long tenantId = TenantContext.getCurrentTenant();
        if (req.nombre == null || req.nombre.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre es obligatorio.");
        }
        int n = jdbcTemplate.update(
            "UPDATE salud_estetica_profesionales SET nombre = ?, telefono = ?, comision_servicios = ?, comision_productos = ?, " +
            "activo = ? WHERE tenant_id = ? AND id = ?",
            req.nombre.trim(), textoOpcional(req.telefono), porcentaje(req.comisionServicios), porcentaje(req.comisionProductos),
            !Boolean.FALSE.equals(req.activo), tenantId, id);
        if (n == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrada.");
        return ResponseEntity.ok(Map.of("id", id));
    }

    /**
     * Comisiones del periodo: servicios (valor de cada sesion por su porcentaje) y productos
     * (total de cada venta por su porcentaje). Se calcula con el porcentaje vigente de cada profesional.
     */
    @GetMapping("/comisiones")
    public ResponseEntity<?> comisiones(@RequestParam String desde, @RequestParam String hasta) {
        validarPermisoDueno();
        Long tenantId = TenantContext.getCurrentTenant();
        List<Map<String, Object>> filas = jdbcTemplate.queryForList(
            "SELECT p.id, p.nombre, p.activo, p.comision_servicios, p.comision_productos, " +
            "COALESCE(s.sesiones, 0) AS sesiones, COALESCE(s.sin_valor, 0) AS sesiones_sin_valor, " +
            "COALESCE(s.total, 0) AS total_servicios, " +
            "ROUND(COALESCE(s.total, 0) * p.comision_servicios / 100, 2) AS comision_servicios_monto, " +
            "COALESCE(v.ventas, 0) AS ventas_productos, COALESCE(v.total, 0) AS total_productos, " +
            "ROUND(COALESCE(v.total, 0) * p.comision_productos / 100, 2) AS comision_productos_monto " +
            "FROM salud_estetica_profesionales p " +
            "LEFT JOIN (SELECT profesional_id, COUNT(*) AS sesiones, COUNT(*) FILTER (WHERE valor IS NULL) AS sin_valor, " +
            "  SUM(COALESCE(valor, 0)) AS total FROM salud_estetica_sesiones " +
            "  WHERE tenant_id = ? AND fecha_sesion BETWEEN ?::date AND ?::date GROUP BY profesional_id) s ON s.profesional_id = p.id " +
            "LEFT JOIN (SELECT profesional_id, COUNT(*) AS ventas, SUM(total) AS total FROM salud_estetica_ventas_productos " +
            "  WHERE tenant_id = ? AND fecha >= ?::date AND fecha < ?::date + 1 GROUP BY profesional_id) v ON v.profesional_id = p.id " +
            "WHERE p.tenant_id = ? AND (p.activo OR s.sesiones IS NOT NULL OR v.ventas IS NOT NULL) ORDER BY p.nombre",
            tenantId, desde, hasta, tenantId, desde, hasta, tenantId);
        Long sinAsignar = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM salud_estetica_sesiones WHERE tenant_id = ? AND profesional_id IS NULL " +
            "AND fecha_sesion BETWEEN ?::date AND ?::date", Long.class, tenantId, desde, hasta);
        return ResponseEntity.ok(Map.of("profesionales", filas, "sesionesSinProfesional", sinAsignar));
    }

    // ==========================================
    // 7. PRODUCTOS (stock en articulos + kardex del nucleo)
    // ==========================================

    @GetMapping("/productos")
    public ResponseEntity<?> listarProductos() {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        List<Map<String, Object>> productos = jdbcTemplate.queryForList(
            "SELECT id, sku, nombre, categoria, stock_actual, stock_minimo, costo_unitario, precio_venta " +
            "FROM articulos WHERE tenant_id = ? ORDER BY nombre", tenantId);
        return ResponseEntity.ok(Map.of("productos", productos, "moneda", motorFinancieroService.obtenerMonedaBase(tenantId)));
    }

    public static class ProductoRequest {
        public String nombre;
        public String sku;
        public String categoria;
        public BigDecimal precioVenta;
        public BigDecimal costoUnitario;
        public BigDecimal stockMinimo;
        public BigDecimal stockInicial;
    }

    private static final Set<String> CATEGORIAS_PRODUCTO = Set.of("Reventa", "Insumo de cabina");

    @PostMapping("/productos")
    @Transactional
    public ResponseEntity<?> crearProducto(@RequestBody ProductoRequest req) {
        validarPermisoDueno();
        Long tenantId = TenantContext.getCurrentTenant();
        if (req.nombre == null || req.nombre.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre del producto es obligatorio.");
        }
        BigDecimal precio = req.precioVenta != null ? req.precioVenta : BigDecimal.ZERO;
        BigDecimal costo = req.costoUnitario != null ? req.costoUnitario : BigDecimal.ZERO;
        if (precio.signum() < 0 || costo.signum() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Precio y costo no pueden ser negativos.");
        }
        Articulo a = new Articulo();
        a.setTenantId(tenantId);
        a.setNombre(req.nombre.trim());
        a.setSku(req.sku != null && !req.sku.isBlank() ? req.sku.trim() : "EST-" + System.currentTimeMillis() % 100000000);
        a.setCategoria(req.categoria != null && CATEGORIAS_PRODUCTO.contains(req.categoria) ? req.categoria : "Reventa");
        a.setUnidadMedida("UNIDAD");
        a.setPorcentajeImpuesto(BigDecimal.ZERO);
        a.setPrecioVenta(precio);
        a.setCostoUnitario(costo);
        a.setMonedaCosto(motorFinancieroService.obtenerMonedaBase(tenantId));
        a.setStockMinimo(req.stockMinimo);
        a.setStockActual(BigDecimal.ZERO);
        Articulo guardado = articuloRepository.save(a);

        if (req.stockInicial != null && req.stockInicial.signum() > 0) {
            inventarioService.registrarMovimientoKardex(guardado.getId(), tenantId, Kardex.TipoOperacion.ENTRADA,
                req.stockInicial, costo, "Estetica: stock inicial");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", guardado.getId()));
    }

    @PutMapping("/productos/{id}")
    @Transactional
    public ResponseEntity<?> actualizarProducto(@PathVariable Long id, @RequestBody ProductoRequest req) {
        validarPermisoDueno();
        Long tenantId = TenantContext.getCurrentTenant();
        if (req.nombre == null || req.nombre.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre del producto es obligatorio.");
        }
        if ((req.precioVenta != null && req.precioVenta.signum() < 0) || (req.costoUnitario != null && req.costoUnitario.signum() < 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Precio y costo no pueden ser negativos.");
        }
        int n = jdbcTemplate.update(
            "UPDATE articulos SET nombre = ?, categoria = COALESCE(?, categoria), precio_venta = COALESCE(?, precio_venta), " +
            "costo_unitario = COALESCE(?, costo_unitario), stock_minimo = ? WHERE tenant_id = ? AND id = ?",
            req.nombre.trim(), req.categoria != null && CATEGORIAS_PRODUCTO.contains(req.categoria) ? req.categoria : null,
            req.precioVenta, req.costoUnitario, req.stockMinimo, tenantId, id);
        if (n == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado.");
        return ResponseEntity.ok(Map.of("id", id));
    }

    public static class EntradaProductoRequest {
        public BigDecimal cantidad;
        public BigDecimal costoUnitario;
    }

    /** Llegada de mercancia: suma stock y queda en el kardex. */
    @PostMapping("/productos/{id}/entrada")
    @Transactional
    public ResponseEntity<?> entradaProducto(@PathVariable Long id, @RequestBody EntradaProductoRequest req) {
        validarPermisoDueno();
        Long tenantId = TenantContext.getCurrentTenant();
        if (req.cantidad == null || req.cantidad.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad debe ser mayor a cero.");
        }
        List<BigDecimal> costo = jdbcTemplate.queryForList(
            "SELECT costo_unitario FROM articulos WHERE tenant_id = ? AND id = ?", BigDecimal.class, tenantId, id);
        if (costo.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado.");
        BigDecimal costoEntrada = req.costoUnitario != null && req.costoUnitario.signum() >= 0 ? req.costoUnitario : costo.get(0);
        inventarioService.registrarMovimientoKardex(id, tenantId, Kardex.TipoOperacion.ENTRADA, req.cantidad, costoEntrada,
            "Estetica: entrada de mercancia");
        return ResponseEntity.ok(Map.of("id", id));
    }

    public static class ItemVenta {
        public Long articuloId;
        public BigDecimal cantidad;
    }

    public static class VentaProductosRequest {
        public String claveIdempotencia;
        public Long pacienteId;
        public Long profesionalId;
        public List<ItemVenta> items;
        public String monedaPago;
        public BigDecimal montoRecibido;
        public CobroConsulta.MetodoPago metodoPago;
        public String referenciaPago;
    }

    /**
     * Vende productos: valida stock, descuenta en kardex y registra el cobro en la caja de salud, todo
     * en una transaccion (si el cobro falla no se descuenta nada). El precio sale del catalogo, no del
     * navegador. La clave de idempotencia evita cobrar y descontar dos veces ante un reintento.
     */
    @PostMapping("/ventas-productos")
    @Transactional
    public ResponseEntity<?> venderProductos(@RequestBody VentaProductosRequest req) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        if (req.claveIdempotencia == null || req.claveIdempotencia.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Falta la clave de la operacion.");
        }
        List<Map<String, Object>> previa = jdbcTemplate.queryForList(
            "SELECT id, cobro_id, total, moneda FROM salud_estetica_ventas_productos WHERE tenant_id = ? AND clave_idempotencia = ?",
            tenantId, req.claveIdempotencia);
        if (!previa.isEmpty()) return ResponseEntity.ok(previa.get(0));

        if (req.items == null || req.items.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agrega al menos un producto.");
        }
        Paciente paciente = null;
        if (req.pacienteId != null) {
            paciente = pacienteRepository.findByTenantIdAndId(tenantId, req.pacienteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Clienta no encontrada."));
        }
        if (req.profesionalId != null) nombreProfesionalActivo(tenantId, req.profesionalId);

        // Agrupar por producto y bloquear las filas para que dos ventas simultaneas no dejen stock negativo.
        Map<Long, BigDecimal> cantidades = new LinkedHashMap<>();
        for (ItemVenta it : req.items) {
            if (it.articuloId == null || it.cantidad == null || it.cantidad.signum() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cada producto necesita una cantidad mayor a cero.");
            }
            cantidades.merge(it.articuloId, it.cantidad, BigDecimal::add);
        }
        BigDecimal total = BigDecimal.ZERO;
        List<String> detalle = new ArrayList<>();
        for (Map.Entry<Long, BigDecimal> e : cantidades.entrySet()) {
            List<Map<String, Object>> fila = jdbcTemplate.queryForList(
                "SELECT nombre, stock_actual, precio_venta, costo_unitario FROM articulos WHERE tenant_id = ? AND id = ? FOR UPDATE",
                tenantId, e.getKey());
            if (fila.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado.");
            String nombre = (String) fila.get(0).get("nombre");
            BigDecimal stock = (BigDecimal) fila.get(0).get("stock_actual");
            if (stock == null || stock.compareTo(e.getValue()) < 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "No hay suficiente " + nombre + " (quedan " + (stock != null ? stock.stripTrailingZeros().toPlainString() : "0") + ").");
            }
            BigDecimal precio = (BigDecimal) fila.get(0).get("precio_venta");
            total = total.add(precio.multiply(e.getValue()));
            detalle.add(e.getValue().stripTrailingZeros().toPlainString() + " x " + nombre);
            BigDecimal costo = (BigDecimal) fila.get(0).get("costo_unitario");
            inventarioService.registrarMovimientoKardex(e.getKey(), tenantId, Kardex.TipoOperacion.SALIDA, e.getValue(),
                costo != null ? costo : BigDecimal.ZERO, "Estetica: venta de producto");
        }
        total = total.setScale(2, java.math.RoundingMode.HALF_UP);
        if (total.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Los productos elegidos no tienen precio de venta.");
        }

        String monedaBase = motorFinancieroService.obtenerMonedaBase(tenantId);
        SaludFinanzasService.CobroRequest cobroReq = new SaludFinanzasService.CobroRequest();
        cobroReq.claveIdempotencia = "venta-productos-" + req.claveIdempotencia;
        cobroReq.pacienteId = req.pacienteId;
        cobroReq.concepto = "Productos: " + String.join(", ", detalle);
        if (cobroReq.concepto.length() > 240) cobroReq.concepto = cobroReq.concepto.substring(0, 237) + "...";
        cobroReq.montoTotal = total;
        cobroReq.monedaCobrada = monedaBase;
        cobroReq.monedaPago = req.monedaPago != null && !req.monedaPago.isBlank() ? req.monedaPago : monedaBase;
        cobroReq.montoRecibido = cobroReq.monedaPago.equalsIgnoreCase(monedaBase) ? total : req.montoRecibido;
        cobroReq.metodoPago = req.metodoPago;
        cobroReq.referenciaPago = textoOpcional(req.referenciaPago);
        cobroReq.cajeroUsuario = AuthContext.getUsername();
        CobroConsulta cobro = saludFinanzasService.procesarCobro(tenantId, cobroReq, paciente);

        Long id = jdbcTemplate.queryForObject(
            "INSERT INTO salud_estetica_ventas_productos (tenant_id, paciente_id, profesional_id, cobro_id, clave_idempotencia, " +
            "total, moneda, detalle) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id", Long.class,
            tenantId, req.pacienteId, req.profesionalId, cobro.getId(), req.claveIdempotencia, total, monedaBase,
            String.join(", ", detalle));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", id, "cobro_id", cobro.getId(), "total", total, "moneda", monedaBase));
    }
}
