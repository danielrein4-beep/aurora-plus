package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.modules.salud.repositories.PacienteRepository;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Portal del paciente odontologico: un enlace personal (el QR impreso en la receta)
 * con el que el paciente consulta su diagnostico, plan, citas y recetas, y sube sus
 * radiografias. Solo se guarda el hash del token; cada enlace vence y se puede revocar.
 */
@RestController
public class OdontologiaPortalController {

    private static final int DIAS_VIGENCIA = 365;
    // Un data URL de ~8 MB equivale a un archivo de unos 6 MB.
    private static final int MAX_ARCHIVO_CHARS = 8_000_000;
    private static final int MAX_SUBIDAS_POR_DIA = 10;
    private static final Set<String> TIPOS_PERMITIDOS = Set.of("image/jpeg", "image/png", "image/webp", "application/pdf");
    private static final Set<String> ESTUDIOS = Set.of("PANORAMICA", "PERIAPICAL", "BITEWING", "CEFALOMETRICA", "FOTOGRAFIA_CLINICA", "TOMOGRAFIA", "OTRO");

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PacienteRepository pacienteRepository;

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Value("${app.frontend.url:http://localhost:8443}")
    private String frontendUrl;

    private final SecureRandom random = new SecureRandom();

    static String sha256(String texto) {
        try {
            byte[] h = MessageDigest.getInstance("SHA-256").digest(texto.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : h) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private void validarPermisoClinico() {
        String rol = AuthContext.getRol();
        if (rol != null && !"DUENO_ADMIN".equalsIgnoreCase(rol) && !"MEDICO".equalsIgnoreCase(rol) && !"SUPER_ADMIN".equalsIgnoreCase(rol)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acceso denegado.");
        }
    }

    // ==========================================
    // PARTE DE LA CLINICA (con sesion)
    // ==========================================

    public static class CrearEnlaceRequest {
        public Long pacienteId;
        // Origen del navegador del odontologo; si no llega se usa app.frontend.url.
        public String origen;
    }

    /** Crea un enlace nuevo del paciente y devuelve la URL y su QR (PNG en data URL). */
    @PostMapping("/api/salud/odontologia/portal/enlaces")
    @Transactional
    public Map<String, Object> crearEnlace(@RequestBody CrearEnlaceRequest req) {
        validarPermisoClinico();
        Long tenantId = TenantContext.getCurrentTenant();
        if (req.pacienteId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paciente requerido.");
        }
        pacienteRepository.findByTenantIdAndId(tenantId, req.pacienteId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paciente no encontrado."));

        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        LocalDateTime expira = LocalDateTime.now().plusDays(DIAS_VIGENCIA);
        jdbcTemplate.update(
            "INSERT INTO salud_odontologia_portal_enlaces (tenant_id, paciente_id, token_hash, creado_por, fecha_expiracion) VALUES (?, ?, ?, ?, ?)",
            tenantId, req.pacienteId, sha256(token), AuthContext.getUsername(), Timestamp.valueOf(expira));

        String base = req.origen != null && req.origen.matches("^https?://[A-Za-z0-9.:\\-]+$") ? req.origen : frontendUrl;
        String url = base + "/odonto-paciente/" + token;
        return Map.of("url", url, "qrPng", qrDataUrl(url), "expira", expira.toString());
    }

    @DeleteMapping("/api/salud/odontologia/portal/enlaces")
    @Transactional
    public Map<String, Object> revocarEnlaces(@RequestParam Long pacienteId) {
        validarPermisoClinico();
        int n = jdbcTemplate.update(
            "UPDATE salud_odontologia_portal_enlaces SET revocado = true WHERE tenant_id = ? AND paciente_id = ? AND revocado = false",
            TenantContext.getCurrentTenant(), pacienteId);
        return Map.of("revocados", n, "mensaje", n + " enlace(s) del paciente desactivado(s).");
    }

    @PatchMapping("/api/salud/odontologia/radiografias/{id}/revisada")
    @Transactional
    public Map<String, Object> marcarRadiografiaRevisada(@PathVariable Long id) {
        validarPermisoClinico();
        int n = jdbcTemplate.update(
            "UPDATE salud_odontologia_radiografias SET revisada = true WHERE tenant_id = ? AND id = ?",
            TenantContext.getCurrentTenant(), id);
        if (n == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Radiografia no encontrada.");
        return Map.of("id", id, "revisada", true);
    }

    private String qrDataUrl(String url) {
        try {
            Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
            hints.put(EncodeHintType.MARGIN, 1);
            BitMatrix matrix = new QRCodeWriter().encode(url, BarcodeFormat.QR_CODE, 360, 360, hints);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(MatrixToImageWriter.toBufferedImage(matrix), "png", out);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo generar el QR.");
        }
    }

    // ==========================================
    // PARTE PUBLICA (sin sesion de la clinica)
    // ==========================================
    // Tener el QR no basta: el paciente confirma su identidad (ultimos 4 digitos de su
    // cedula) y recibe una sesion firmada de 30 minutos. Sin esa sesion no se entrega
    // ningun dato clinico. Tras 5 fallos el enlace queda bloqueado 15 minutos.

    private static final int MAX_INTENTOS = 5;
    private static final int MINUTOS_BLOQUEO = 15;
    private static final long SESION_MS = 30 * 60 * 1000L;

    @Value("${jwt.secret}")
    private String secreto;

    private record Acceso(Long enlaceId, Long tenantId, Long pacienteId) {}

    // Mismo mensaje para token inexistente, vencido o revocado: no se revela cual fue.
    private Acceso resolver(String token) {
        if (token == null || token.length() < 30 || token.length() > 64) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Enlace no valido o vencido.");
        }
        List<Map<String, Object>> filas = jdbcTemplate.queryForList(
            "SELECT id, tenant_id, paciente_id FROM salud_odontologia_portal_enlaces " +
            "WHERE token_hash = ? AND revocado = false AND fecha_expiracion > now()",
            sha256(token));
        if (filas.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Enlace no valido o vencido.");
        }
        Map<String, Object> f = filas.get(0);
        return new Acceso(((Number) f.get("id")).longValue(), ((Number) f.get("tenant_id")).longValue(),
            ((Number) f.get("paciente_id")).longValue());
    }

    private byte[] hmac(String datos) {
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new javax.crypto.spec.SecretKeySpec(("portal-odonto:" + secreto).getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return mac.doFinal(datos.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private String emitirSesion(Long enlaceId) {
        String datos = enlaceId + ":" + (System.currentTimeMillis() + SESION_MS);
        Base64.Encoder b64 = Base64.getUrlEncoder().withoutPadding();
        return b64.encodeToString(datos.getBytes(StandardCharsets.UTF_8)) + "." + b64.encodeToString(hmac(datos));
    }

    /** Resuelve el enlace y exige una sesion valida emitida para ese mismo enlace. */
    private Acceso resolverConSesion(String token, String sesion) {
        Acceso a = resolver(token);
        try {
            String[] partes = sesion == null ? new String[0] : sesion.split("\\.");
            if (partes.length != 2) throw new IllegalArgumentException();
            String datos = new String(Base64.getUrlDecoder().decode(partes[0]), StandardCharsets.UTF_8);
            if (!MessageDigest.isEqual(hmac(datos), Base64.getUrlDecoder().decode(partes[1]))) throw new IllegalArgumentException();
            String[] campos = datos.split(":");
            if (Long.parseLong(campos[0]) != a.enlaceId() || Long.parseLong(campos[1]) < System.currentTimeMillis()) {
                throw new IllegalArgumentException();
            }
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Su sesion vencio. Confirme su identidad de nuevo.");
        }
        jdbcTemplate.update("UPDATE salud_odontologia_portal_enlaces SET ultimo_acceso = now() WHERE id = ?", a.enlaceId());
        return a;
    }

    private static <T> ResponseEntity<T> sinCache(HttpStatus estado, T cuerpo) {
        return ResponseEntity.status(estado).cacheControl(org.springframework.http.CacheControl.noStore()).body(cuerpo);
    }

    /** Lo unico visible sin verificar: el nombre de la clinica y como confirmar la identidad. */
    @GetMapping("/api/public/odontologia/portal/{token}/inicio")
    public ResponseEntity<Map<String, Object>> inicio(@PathVariable String token) {
        Acceso a = resolver(token);
        return sinCache(HttpStatus.OK, Map.of(
            "clinica", licenciaTenantRepository.findByTenantId(a.tenantId()).map(l -> l.getNombreEmpresa()).orElse("Su clinica odontologica"),
            "metodo", respuestaEsperada(a).startsWith("A") ? "ANIO_NACIMIENTO" : "CEDULA"));
    }

    // "C1234" = ultimos 4 digitos de la cedula; "A1990" = ano de nacimiento si la cedula no tiene 4 digitos.
    private String respuestaEsperada(Acceso a) {
        Map<String, Object> p = jdbcTemplate.queryForMap(
            "SELECT identificacion, fecha_nacimiento FROM salud_pacientes WHERE tenant_id = ? AND id = ?", a.tenantId(), a.pacienteId());
        String digitos = p.get("identificacion") != null ? p.get("identificacion").toString().replaceAll("\\D", "") : "";
        if (digitos.length() >= 4) return "C" + digitos.substring(digitos.length() - 4);
        if (p.get("fecha_nacimiento") != null) return "A" + p.get("fecha_nacimiento").toString().substring(0, 4);
        throw new ResponseStatusException(HttpStatus.CONFLICT,
            "Su ficha no tiene datos para confirmar su identidad. Pidale a su clinica que registre su cedula.");
    }

    public static class VerificarRequest {
        public String respuesta;
    }

    @PostMapping("/api/public/odontologia/portal/{token}/verificar")
    @Transactional
    public ResponseEntity<Map<String, Object>> verificar(@PathVariable String token, @RequestBody VerificarRequest req) {
        Acceso a = resolver(token);
        Map<String, Object> enlace = jdbcTemplate.queryForMap(
            "SELECT intentos_fallidos, bloqueado_hasta > now() AS bloqueado FROM salud_odontologia_portal_enlaces WHERE id = ? FOR UPDATE",
            a.enlaceId());
        if (Boolean.TRUE.equals(enlace.get("bloqueado"))) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Demasiados intentos. Por seguridad espere " + MINUTOS_BLOQUEO + " minutos e intente de nuevo.");
        }
        String esperada = respuestaEsperada(a).substring(1);
        String dada = req.respuesta == null ? "" : req.respuesta.replaceAll("\\D", "");
        if (!MessageDigest.isEqual(esperada.getBytes(StandardCharsets.UTF_8), dada.getBytes(StandardCharsets.UTF_8))) {
            int intentos = ((Number) enlace.get("intentos_fallidos")).intValue() + 1;
            if (intentos >= MAX_INTENTOS) {
                jdbcTemplate.update(
                    "UPDATE salud_odontologia_portal_enlaces SET intentos_fallidos = 0, bloqueado_hasta = now() + make_interval(mins => ?) WHERE id = ?",
                    MINUTOS_BLOQUEO, a.enlaceId());
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Demasiados intentos. Por seguridad espere " + MINUTOS_BLOQUEO + " minutos e intente de nuevo.");
            }
            jdbcTemplate.update("UPDATE salud_odontologia_portal_enlaces SET intentos_fallidos = ? WHERE id = ?", intentos, a.enlaceId());
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "El dato no coincide. Le quedan " + (MAX_INTENTOS - intentos) + " intento(s).");
        }
        jdbcTemplate.update(
            "UPDATE salud_odontologia_portal_enlaces SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_acceso = now() WHERE id = ?",
            a.enlaceId());
        return sinCache(HttpStatus.OK, Map.of("sesion", emitirSesion(a.enlaceId()), "minutos", SESION_MS / 60000));
    }

    @GetMapping("/api/public/odontologia/portal/{token}")
    @Transactional
    public ResponseEntity<Map<String, Object>> verPortal(@PathVariable String token,
            @RequestHeader(value = "X-Portal-Sesion", required = false) String sesion) {
        Acceso a = resolverConSesion(token, sesion);
        Long t = a.tenantId();
        Long p = a.pacienteId();
        Map<String, Object> r = new LinkedHashMap<>();

        r.put("clinica", licenciaTenantRepository.findByTenantId(t).map(l -> l.getNombreEmpresa()).orElse("Su clinica odontologica"));
        r.put("paciente", jdbcTemplate.queryForObject(
            "SELECT split_part(trim(nombres), ' ', 1) FROM salud_pacientes WHERE tenant_id = ? AND id = ?", String.class, t, p));

        // Diagnostico: las piezas con algun hallazgo en el odontograma.
        r.put("hallazgos", jdbcTemplate.queryForList(
            "SELECT numero_fdi, estado, caras_json::text AS caras, notas FROM salud_odontograma_dientes " +
            "WHERE tenant_id = ? AND paciente_id = ? AND estado <> 'SANO' ORDER BY numero_fdi", t, p));

        List<Map<String, Object>> planes = jdbcTemplate.queryForList(
            "SELECT id, nombre_plan, estado, monto_total_usd, monto_pagado_usd, fecha_creacion " +
            "FROM salud_odontologia_planes_tratamiento WHERE tenant_id = ? AND paciente_id = ? AND estado <> 'CANCELADO' ORDER BY id DESC", t, p);
        for (Map<String, Object> plan : planes) {
            Long planId = ((Number) plan.get("id")).longValue();
            plan.put("items", jdbcTemplate.queryForList(
                "SELECT fase, diente_fdi, procedimiento, costo_usd, estado, fecha_realizado FROM salud_odontologia_plan_items " +
                "WHERE tenant_id = ? AND plan_id = ? AND estado <> 'ANULADO' ORDER BY id", t, planId));
            plan.put("cuotas", jdbcTemplate.queryForList(
                "SELECT numero, fecha_vencimiento, monto_usd FROM salud_odontologia_plan_cuotas WHERE tenant_id = ? AND plan_id = ? ORDER BY numero", t, planId));
            plan.remove("id");
        }
        r.put("planes", planes);

        r.put("proximasCitas", jdbcTemplate.queryForList(
            "SELECT fecha_cita, hora_inicio, odontologo, motivo, estado FROM salud_odontologia_citas_agenda " +
            "WHERE tenant_id = ? AND paciente_id = ? AND fecha_cita >= CURRENT_DATE AND estado NOT IN ('CANCELADA', 'NO_ASISTIO') " +
            "ORDER BY fecha_cita, hora_inicio LIMIT 10", t, p));

        r.put("recetas", jdbcTemplate.queryForList(
            "SELECT fecha_registro, odontologo, diagnostico, items_json::text AS items, indicaciones FROM salud_odontologia_recetas " +
            "WHERE tenant_id = ? AND paciente_id = ? ORDER BY fecha_registro DESC LIMIT 10", t, p));

        r.put("radiografias", jdbcTemplate.queryForList(
            "SELECT id, titulo, tipo_estudio, fecha_toma, origen, hallazgos FROM salud_odontologia_radiografias " +
            "WHERE tenant_id = ? AND paciente_id = ? ORDER BY fecha_toma DESC, id DESC", t, p));
        return sinCache(HttpStatus.OK, r);
    }

    @GetMapping("/api/public/odontologia/portal/{token}/radiografias/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> verRadiografia(@PathVariable String token, @PathVariable Long id,
            @RequestHeader(value = "X-Portal-Sesion", required = false) String sesion) {
        Acceso a = resolverConSesion(token, sesion);
        List<Map<String, Object>> filas = jdbcTemplate.queryForList(
            "SELECT url_archivo FROM salud_odontologia_radiografias WHERE tenant_id = ? AND paciente_id = ? AND id = ?",
            a.tenantId(), a.pacienteId(), id);
        if (filas.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Radiografia no encontrada.");
        return sinCache(HttpStatus.OK, Map.of("archivo", filas.get(0).get("url_archivo")));
    }

    public static class SubirRadiografiaRequest {
        public String titulo;
        public String tipoEstudio;
        public String archivo;
    }

    @PostMapping("/api/public/odontologia/portal/{token}/radiografias")
    @Transactional
    public ResponseEntity<?> subirRadiografia(@PathVariable String token, @RequestBody SubirRadiografiaRequest req,
            @RequestHeader(value = "X-Portal-Sesion", required = false) String sesion) {
        Acceso a = resolverConSesion(token, sesion);
        if (req.archivo == null || req.archivo.length() > MAX_ARCHIVO_CHARS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El archivo es obligatorio y no puede pasar de 6 MB.");
        }
        int coma = req.archivo.indexOf(";base64,");
        String mime = req.archivo.startsWith("data:") && coma > 5 ? req.archivo.substring(5, coma) : "";
        if (!TIPOS_PERMITIDOS.contains(mime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Solo se aceptan fotos (JPG, PNG, WEBP) o PDF.");
        }
        try {
            Base64.getDecoder().decode(req.archivo.substring(coma + 8));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El archivo esta danado.");
        }
        Integer hoy = jdbcTemplate.queryForObject(
            "SELECT count(*) FROM salud_odontologia_radiografias WHERE tenant_id = ? AND paciente_id = ? AND origen = 'PACIENTE' " +
            "AND fecha_registro > now() - interval '1 day'", Integer.class, a.tenantId(), a.pacienteId());
        if (hoy != null && hoy >= MAX_SUBIDAS_POR_DIA) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Llego al limite de " + MAX_SUBIDAS_POR_DIA + " archivos por dia.");
        }
        String tipo = req.tipoEstudio != null && ESTUDIOS.contains(req.tipoEstudio) ? req.tipoEstudio : "OTRO";
        String titulo = req.titulo != null && !req.titulo.isBlank()
            ? req.titulo.trim().substring(0, Math.min(150, req.titulo.trim().length()))
            : "Estudio enviado por el paciente";
        Long id = jdbcTemplate.queryForObject(
            "INSERT INTO salud_odontologia_radiografias (tenant_id, paciente_id, tipo_estudio, titulo, url_archivo, origen, revisada) " +
            "VALUES (?, ?, ?, ?, ?, 'PACIENTE', false) RETURNING id",
            Long.class, a.tenantId(), a.pacienteId(), tipo, titulo, req.archivo);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
            "id", id, "mensaje", "Recibimos su estudio. Su odontologo lo revisara en su proxima consulta."));
    }
}
