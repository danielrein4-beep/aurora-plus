package com.auroraplus.modules.ganaderia.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Verificación de fincas para el Mercado Ganadero. El acceso va por niveles:
 * - MIRAR: cualquier finca con Ganadería (la vitrina no pide papeles, si no el mercado se ve vacío).
 * - COMPRAR (ofertar y chatear): ubicación de la finca cargada + cédula del titular verificada.
 * - VENDER (publicar): además, registro de hierro verificado: es lo que prueba de quién es el
 *   ganado. El título de la tierra o el arrendamiento es opcional y solo suma confianza.
 *
 * Los documentos son datos sensibles: se guardan cifrados (AES-GCM) con una clave que no vive en
 * la base, solo los abre el equipo verificador desde el SuperAdmin y cada apertura queda anotada.
 * Ningún endpoint de fincas devuelve su contenido, ni siquiera a la finca que lo subió.
 */
@Service
public class VerificacionMercadoService {

    public static final Set<String> TIPOS = Set.of("CEDULA", "HIERRO", "TIERRA");
    private static final Set<String> TIPOS_ARCHIVO = Set.of("application/pdf", "image/jpeg", "image/png", "image/webp");
    private static final int MAX_BYTES = 5 * 1024 * 1024;

    public enum Nivel { MIRAR, COMPRAR, VENDER }

    @Autowired
    private JdbcTemplate jdbc;

    /** Clave propia si está configurada; si no, derivada del secreto de sesiones (nunca se guarda en la base). */
    @Value("${MERCADO_DOCUMENTOS_SECRET:${jwt.secret}}")
    private String secreto;

    private final SecureRandom azar = new SecureRandom();

    // ─────────────────────────── estado de una finca ───────────────────────────

    public Map<String, Object> estado(Long tenantId) {
        Map<String, Object> salida = new LinkedHashMap<>();
        Map<String, Object> datos = unaFila("SELECT titular_nombre, titular_cedula, numero_hierro, tipo_tierra FROM mercado_verificaciones WHERE tenant_id = ?", tenantId);
        salida.put("titularNombre", datos == null ? null : datos.get("titular_nombre"));
        salida.put("titularCedula", datos == null ? null : datos.get("titular_cedula"));
        salida.put("numeroHierro", datos == null ? null : datos.get("numero_hierro"));
        salida.put("tipoTierra", datos == null ? null : datos.get("tipo_tierra"));
        salida.put("ubicacionCargada", tieneUbicacion(tenantId));

        Map<String, Object> docs = new LinkedHashMap<>();
        for (Map<String, Object> d : jdbc.queryForList(
                "SELECT tipo, estado, nombre_archivo, subido_en, revisado_en, motivo_rechazo FROM mercado_documentos_verificacion WHERE tenant_id = ?", tenantId)) {
            Map<String, Object> doc = new LinkedHashMap<>();
            doc.put("estado", d.get("estado"));
            doc.put("nombreArchivo", d.get("nombre_archivo"));
            doc.put("subidoEn", d.get("subido_en"));
            doc.put("revisadoEn", d.get("revisado_en"));
            doc.put("motivoRechazo", d.get("motivo_rechazo"));
            docs.put((String) d.get("tipo"), doc);
        }
        salida.put("documentos", docs);
        Nivel nivel = nivel(tenantId);
        salida.put("nivel", nivel.name());
        salida.put("puedeComprar", nivel != Nivel.MIRAR);
        salida.put("puedeVender", nivel == Nivel.VENDER);
        return salida;
    }

    public Nivel nivel(Long tenantId) {
        Set<String> aprobados = new HashSet<>(jdbc.queryForList(
            "SELECT tipo FROM mercado_documentos_verificacion WHERE tenant_id = ? AND estado = 'APROBADO'", String.class, tenantId));
        if (!tieneUbicacion(tenantId) || !aprobados.contains("CEDULA")) return Nivel.MIRAR;
        return aprobados.contains("HIERRO") ? Nivel.VENDER : Nivel.COMPRAR;
    }

    /** Lanza un error claro si a la finca le falta algo para lo que quiere hacer. */
    public void exigir(Long tenantId, Nivel requerido) {
        Nivel actual = nivel(tenantId);
        if (actual.ordinal() >= requerido.ordinal()) return;
        if (requerido == Nivel.VENDER && actual == Nivel.COMPRAR) {
            throw new RuntimeException("Para publicar ganado, Aurora debe verificar tu registro de hierro. Cárgalo en \"Verificación\" del mercado.");
        }
        throw new RuntimeException("Para " + (requerido == Nivel.VENDER ? "publicar" : "ofertar o escribir")
            + " en el mercado, completa la verificación de tu finca: ubicación y cédula del titular"
            + (requerido == Nivel.VENDER ? ", más el registro de hierro" : "") + ".");
    }

    /** Qué ya verificó Aurora de cada finca, para la tarjeta del vendedor (sin exponer ningún documento). */
    public Map<Long, Set<String>> aprobadosDe(Collection<Long> tenants) {
        Map<Long, Set<String>> salida = new HashMap<>();
        if (tenants.isEmpty()) return salida;
        String en = String.join(",", Collections.nCopies(tenants.size(), "?"));
        for (Map<String, Object> r : jdbc.queryForList("SELECT tenant_id, tipo FROM mercado_documentos_verificacion WHERE estado = 'APROBADO' AND tenant_id IN (" + en + ")",
                tenants.toArray())) {
            salida.computeIfAbsent(((Number) r.get("tenant_id")).longValue(), k -> new HashSet<>()).add((String) r.get("tipo"));
        }
        return salida;
    }

    // ─────────────────────────── la finca carga sus datos ───────────────────────────

    public static class Archivo {
        public String nombre;
        /** data:<tipo>;base64,<contenido> */
        public String dataUrl;
    }

    @Transactional
    public Map<String, Object> guardar(Long tenantId, String usuario, String titularNombre, String titularCedula,
                                       String numeroHierro, String tipoTierra, Map<String, Archivo> archivos) {
        String cedula = limpiar(titularCedula, 30);
        if (cedula != null && !cedula.toUpperCase().matches("[VEJPG]?-?\\d{5,10}")) {
            throw new RuntimeException("La cédula debe tener el formato V-12345678");
        }
        String tierra = limpiar(tipoTierra, 20);
        if (tierra != null && !Set.of("PROPIEDAD", "ARRENDAMIENTO", "COMODATO").contains(tierra.toUpperCase())) {
            throw new RuntimeException("Tipo de documento de la tierra no válido");
        }
        Map<String, Object> antes = unaFila("SELECT titular_nombre, titular_cedula, numero_hierro FROM mercado_verificaciones WHERE tenant_id = ?", tenantId);
        jdbc.update("INSERT INTO mercado_verificaciones (tenant_id, titular_nombre, titular_cedula, numero_hierro, tipo_tierra, actualizado_en) "
                + "VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (tenant_id) DO UPDATE SET "
                + "titular_nombre = COALESCE(EXCLUDED.titular_nombre, mercado_verificaciones.titular_nombre), "
                + "titular_cedula = COALESCE(EXCLUDED.titular_cedula, mercado_verificaciones.titular_cedula), "
                + "numero_hierro = COALESCE(EXCLUDED.numero_hierro, mercado_verificaciones.numero_hierro), "
                + "tipo_tierra = COALESCE(EXCLUDED.tipo_tierra, mercado_verificaciones.tipo_tierra), actualizado_en = EXCLUDED.actualizado_en",
            tenantId, limpiar(titularNombre, 160), cedula == null ? null : cedula.toUpperCase(), limpiar(numeroHierro, 60),
            tierra == null ? null : tierra.toUpperCase(), Timestamp.valueOf(LocalDateTime.now()));

        // Si cambian los datos que el equipo ya comparó con un documento aprobado, ese documento vuelve a revisión.
        if (antes != null) {
            if (cambio(antes.get("titular_nombre"), titularNombre) || cambio(antes.get("titular_cedula"), cedula)) volverARevision(tenantId, "CEDULA");
            if (cambio(antes.get("numero_hierro"), numeroHierro)) volverARevision(tenantId, "HIERRO");
        }

        if (archivos != null) {
            for (Map.Entry<String, Archivo> e : archivos.entrySet()) {
                if (e.getValue() == null || e.getValue().dataUrl == null || e.getValue().dataUrl.isBlank()) continue;
                guardarDocumento(tenantId, usuario, e.getKey().toUpperCase(), e.getValue());
            }
        }
        return estado(tenantId);
    }

    private void guardarDocumento(Long tenantId, String usuario, String tipo, Archivo archivo) {
        if (!TIPOS.contains(tipo)) throw new RuntimeException("Tipo de documento no válido");
        String dataUrl = archivo.dataUrl.trim();
        int coma = dataUrl.indexOf(',');
        if (!dataUrl.startsWith("data:") || coma < 0 || !dataUrl.substring(0, coma).endsWith(";base64")) {
            throw new RuntimeException("El archivo no llegó bien, vuelve a elegirlo");
        }
        String tipoContenido = dataUrl.substring(5, dataUrl.indexOf(';')).toLowerCase();
        if (!TIPOS_ARCHIVO.contains(tipoContenido)) throw new RuntimeException("Sube el documento en PDF, JPG o PNG");
        byte[] contenido;
        try {
            contenido = Base64.getDecoder().decode(dataUrl.substring(coma + 1));
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("El archivo no llegó bien, vuelve a elegirlo");
        }
        if (contenido.length == 0) throw new RuntimeException("El archivo está vacío");
        if (contenido.length > MAX_BYTES) throw new RuntimeException("Cada documento puede pesar hasta 5 MB");
        if (!coincideFirma(tipoContenido, contenido)) throw new RuntimeException("El archivo no es un " + tipoContenido.replace("application/", "").replace("image/", "").toUpperCase() + " válido");

        byte[] iv = new byte[12];
        azar.nextBytes(iv);
        byte[] cifrado = cifrar(contenido, iv, tenantId, tipo);
        jdbc.update("INSERT INTO mercado_documentos_verificacion (tenant_id, tipo, estado, nombre_archivo, tipo_contenido, contenido_cifrado, "
                + "vector_inicial, tamano_bytes, subido_por, subido_en) VALUES (?, ?, 'PENDIENTE', ?, ?, ?, ?, ?, ?, ?) "
                + "ON CONFLICT (tenant_id, tipo) DO UPDATE SET estado = 'PENDIENTE', nombre_archivo = EXCLUDED.nombre_archivo, "
                + "tipo_contenido = EXCLUDED.tipo_contenido, contenido_cifrado = EXCLUDED.contenido_cifrado, vector_inicial = EXCLUDED.vector_inicial, "
                + "tamano_bytes = EXCLUDED.tamano_bytes, subido_por = EXCLUDED.subido_por, subido_en = EXCLUDED.subido_en, "
                + "revisado_por = NULL, revisado_en = NULL, motivo_rechazo = NULL",
            tenantId, tipo, limpiar(archivo.nombre, 200), tipoContenido, cifrado, iv, contenido.length, usuario, Timestamp.valueOf(LocalDateTime.now()));
    }

    // ─────────────────────────── equipo verificador (SuperAdmin) ───────────────────────────

    public List<Map<String, Object>> solicitudes(String filtroEstado) {
        String estado = filtroEstado == null || filtroEstado.isBlank() ? "PENDIENTE" : filtroEstado.toUpperCase();
        List<Map<String, Object>> filas = jdbc.queryForList(
            "SELECT DISTINCT d.tenant_id, l.nombre_empresa, v.titular_nombre, v.titular_cedula, v.numero_hierro, v.tipo_tierra, "
                + "MAX(d.subido_en) OVER (PARTITION BY d.tenant_id) AS ultimo_envio "
                + "FROM mercado_documentos_verificacion d LEFT JOIN licencias_tenant l ON l.tenant_id = d.tenant_id "
                + "LEFT JOIN mercado_verificaciones v ON v.tenant_id = d.tenant_id "
                + ("TODOS".equals(estado) ? "" : "WHERE d.tenant_id IN (SELECT tenant_id FROM mercado_documentos_verificacion WHERE estado = ?) ")
                + "ORDER BY ultimo_envio DESC",
            "TODOS".equals(estado) ? new Object[]{} : new Object[]{estado});
        for (Map<String, Object> f : filas) {
            Long t = ((Number) f.get("tenant_id")).longValue();
            f.put("ubicacionCargada", tieneUbicacion(t));
            f.put("nivel", nivel(t).name());
            f.put("documentos", jdbc.queryForList(
                "SELECT id, tipo, estado, nombre_archivo, tipo_contenido, tamano_bytes, subido_en, revisado_por, revisado_en, motivo_rechazo "
                    + "FROM mercado_documentos_verificacion WHERE tenant_id = ? ORDER BY tipo", t));
        }
        return filas;
    }

    public record DocumentoAbierto(String nombre, String tipoContenido, byte[] contenido) {}

    @Transactional
    public DocumentoAbierto abrir(Long documentoId, String usuario) {
        Map<String, Object> d = unaFila("SELECT tenant_id, tipo, nombre_archivo, tipo_contenido, contenido_cifrado, vector_inicial "
            + "FROM mercado_documentos_verificacion WHERE id = ?", documentoId);
        if (d == null) throw new RuntimeException("Documento no encontrado");
        Long tenantId = ((Number) d.get("tenant_id")).longValue();
        byte[] claro = descifrar((byte[]) d.get("contenido_cifrado"), (byte[]) d.get("vector_inicial"), tenantId, (String) d.get("tipo"));
        anotarAcceso(documentoId, tenantId, usuario, "VER");
        return new DocumentoAbierto((String) d.get("nombre_archivo"), (String) d.get("tipo_contenido"), claro);
    }

    @Transactional
    public void revisar(Long documentoId, String usuario, boolean aprobar, String motivo) {
        Map<String, Object> d = unaFila("SELECT tenant_id FROM mercado_documentos_verificacion WHERE id = ?", documentoId);
        if (d == null) throw new RuntimeException("Documento no encontrado");
        if (!aprobar && (motivo == null || motivo.isBlank())) throw new RuntimeException("Indica el motivo del rechazo: la finca lo verá para corregirlo");
        jdbc.update("UPDATE mercado_documentos_verificacion SET estado = ?, revisado_por = ?, revisado_en = ?, motivo_rechazo = ? WHERE id = ?",
            aprobar ? "APROBADO" : "RECHAZADO", usuario, Timestamp.valueOf(LocalDateTime.now()), aprobar ? null : limpiar(motivo, 500), documentoId);
        anotarAcceso(documentoId, ((Number) d.get("tenant_id")).longValue(), usuario, aprobar ? "APROBAR" : "RECHAZAR");
    }

    // ─────────────────────────── utilidades ───────────────────────────

    private boolean tieneUbicacion(Long tenantId) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM fincas_ganaderia WHERE tenant_id = ? AND latitud IS NOT NULL AND longitud IS NOT NULL",
            Integer.class, tenantId);
        return n != null && n > 0;
    }

    private void volverARevision(Long tenantId, String tipo) {
        jdbc.update("UPDATE mercado_documentos_verificacion SET estado = 'PENDIENTE', revisado_por = NULL, revisado_en = NULL "
            + "WHERE tenant_id = ? AND tipo = ? AND estado = 'APROBADO'", tenantId, tipo);
    }

    private void anotarAcceso(Long documentoId, Long tenantId, String usuario, String accion) {
        jdbc.update("INSERT INTO mercado_documentos_accesos (documento_id, tenant_id, usuario, accion, fecha) VALUES (?, ?, ?, ?, ?)",
            documentoId, tenantId, usuario == null ? "desconocido" : usuario, accion, Timestamp.valueOf(LocalDateTime.now()));
    }

    /** El tipo declarado debe coincidir con los primeros bytes: evita subir cualquier cosa renombrada. */
    private static boolean coincideFirma(String tipo, byte[] b) {
        return switch (tipo) {
            case "application/pdf" -> b.length > 4 && b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F';
            case "image/png" -> b.length > 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G';
            case "image/jpeg" -> b.length > 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8;
            case "image/webp" -> b.length > 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' && b[8] == 'W' && b[9] == 'E';
            default -> false;
        };
    }

    private byte[] cifrar(byte[] claro, byte[] iv, Long tenantId, String tipo) {
        try {
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.ENCRYPT_MODE, clave(), new GCMParameterSpec(128, iv));
            c.updateAAD(("mercado-doc:" + tenantId + ":" + tipo).getBytes(StandardCharsets.UTF_8));
            return c.doFinal(claro);
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo cifrar el documento", e);
        }
    }

    private byte[] descifrar(byte[] cifrado, byte[] iv, Long tenantId, String tipo) {
        try {
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.DECRYPT_MODE, clave(), new GCMParameterSpec(128, iv));
            // El dato adicional ata el contenido a su finca y tipo: copiar la fila a otra finca no se descifra.
            c.updateAAD(("mercado-doc:" + tenantId + ":" + tipo).getBytes(StandardCharsets.UTF_8));
            return c.doFinal(cifrado);
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo abrir el documento (clave distinta o archivo alterado)", e);
        }
    }

    private SecretKeySpec clave() throws Exception {
        byte[] k = MessageDigest.getInstance("SHA-256").digest(("aurora-mercado-documentos:" + secreto).getBytes(StandardCharsets.UTF_8));
        return new SecretKeySpec(k, "AES");
    }

    private Map<String, Object> unaFila(String sql, Object... params) {
        List<Map<String, Object>> filas = jdbc.queryForList(sql, params);
        return filas.isEmpty() ? null : filas.get(0);
    }

    private static boolean cambio(Object antes, String ahora) {
        if (ahora == null || ahora.isBlank()) return false;
        return antes == null || !antes.toString().trim().equalsIgnoreCase(ahora.trim());
    }

    private static String limpiar(String s, int max) {
        if (s == null) return null;
        String t = s.trim();
        if (t.isEmpty()) return null;
        return t.length() > max ? t.substring(0, max) : t;
    }
}
