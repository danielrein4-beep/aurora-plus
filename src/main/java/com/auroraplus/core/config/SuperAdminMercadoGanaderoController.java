package com.auroraplus.core.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.auroraplus.core.auth.AuthContext;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.*;

/**
 * Vigilancia del mercado ganadero para el super-admin: volumen y comisiones,
 * intentos de pasar datos de contacto y tratos que parecen haberse cerrado por
 * fuera para no pagar la comisión. Leer está abierto a todo el equipo (vive
 * bajo /inteligencia); suspender o reactivar una finca es un POST, que
 * PermisosSuperAdmin solo deja pasar al PROPIETARIO.
 */
@RestController
@RequestMapping("/api/super-admin/inteligencia/mercado-ganadero")
public class SuperAdminMercadoGanaderoController {

    @Autowired
    private JdbcTemplate jdbc;

    @GetMapping
    public Map<String, Object> panel(@RequestParam(defaultValue = "30") int dias) {
        Timestamp desde = Timestamp.valueOf(LocalDate.now().minusDays(Math.max(1, Math.min(dias, 3650)) - 1L).atStartOfDay());

        Map<String, Object> resumen = new LinkedHashMap<>();
        resumen.put("publicacionesActivas", contar("SELECT COUNT(*) FROM publicaciones_venta WHERE estado = 'ACTIVA' AND categoria IS NOT NULL"));
        resumen.put("tratosPeriodo", contar("SELECT COUNT(*) FROM publicaciones_venta WHERE estado = 'VENDIDA' AND fecha_cierre >= ?", desde));
        resumen.put("volumenPeriodo", jdbc.queryForObject(
            "SELECT COALESCE(SUM(precio_final), 0) FROM publicaciones_venta WHERE estado = 'VENDIDA' AND fecha_cierre >= ?", Object.class, desde));
        resumen.put("comisionesGeneradas", jdbc.queryForObject(
            "SELECT COALESCE(SUM(monto_comision), 0) FROM comisiones_plataforma WHERE origen LIKE 'mercado-ganado-%' AND fecha >= ?", Object.class, desde));
        resumen.put("comisionesPendientes", jdbc.queryForObject(
            "SELECT COALESCE(SUM(monto_comision), 0) FROM comisiones_plataforma WHERE origen LIKE 'mercado-ganado-%' AND NOT pagada", Object.class));
        resumen.put("comisionesCobradas", jdbc.queryForObject(
            "SELECT COALESCE(SUM(monto_comision), 0) FROM comisiones_plataforma WHERE origen LIKE 'mercado-ganado-%' AND pagada", Object.class));
        resumen.put("intentosContactoPeriodo", contar("SELECT COUNT(*) FROM mercado_ganado_alertas WHERE fecha >= ?", desde));

        List<Map<String, Object>> alertas = jdbc.queryForList(
            "SELECT a.id, a.tipo, a.fecha, a.contenido_original AS contenido, a.publicacion_id AS \"publicacionId\", p.titulo, "
                + "a.tenant_id AS \"fincaTenantId\", l1.nombre_empresa AS finca, a.otra_parte_tenant_id AS \"otraFincaTenantId\", l2.nombre_empresa AS \"otraFinca\" "
                + "FROM mercado_ganado_alertas a LEFT JOIN publicaciones_venta p ON p.id = a.publicacion_id "
                + "LEFT JOIN licencias_tenant l1 ON l1.tenant_id = a.tenant_id LEFT JOIN licencias_tenant l2 ON l2.tenant_id = a.otra_parte_tenant_id "
                + "WHERE a.fecha >= ? ORDER BY a.fecha DESC LIMIT 100", desde);

        List<Map<String, Object>> sospechas = new ArrayList<>();
        // 1) Retiró la publicación después de negociar con alguien.
        for (Map<String, Object> r : jdbc.queryForList(
                "SELECT p.id, p.titulo, p.fecha_cierre AS fecha, p.tenant_id AS vendedor_id, lv.nombre_empresa AS vendedor, c.comprador_tenant_id AS comprador_id, lc.nombre_empresa AS comprador, "
                    + "(SELECT COUNT(*) FROM mercado_ganado_mensajes m WHERE m.publicacion_id = p.id AND m.comprador_tenant_id = c.comprador_tenant_id) AS mensajes "
                    + "FROM publicaciones_venta p JOIN (SELECT DISTINCT publicacion_id, comprador_tenant_id FROM mercado_ganado_mensajes) c ON c.publicacion_id = p.id "
                    + "LEFT JOIN licencias_tenant lv ON lv.tenant_id = p.tenant_id LEFT JOIN licencias_tenant lc ON lc.tenant_id = c.comprador_tenant_id "
                    + "WHERE p.estado = 'RETIRADA' ORDER BY p.fecha_cierre DESC LIMIT 50")) {
            sospechas.add(sospecha(r, "RETIRADA_TRAS_NEGOCIAR",
                "Retiró la publicación después de " + r.get("mensajes") + " mensaje(s) con " + r.get("comprador")));
        }
        // 2) El animal salió del hato del vendedor sin cerrarse el trato en el mercado.
        for (Map<String, Object> r : jdbc.queryForList(
                "SELECT p.id, p.titulo, p.fecha_publicacion AS fecha, p.tenant_id AS vendedor_id, lv.nombre_empresa AS vendedor, a.estado AS estado_animal, "
                    + "(SELECT STRING_AGG(DISTINCT lc.nombre_empresa, ', ') FROM mercado_ganado_mensajes m JOIN licencias_tenant lc ON lc.tenant_id = m.comprador_tenant_id "
                    + " WHERE m.publicacion_id = p.id) AS comprador "
                    + "FROM publicaciones_venta p JOIN animales a ON a.id = p.animal_id LEFT JOIN licencias_tenant lv ON lv.tenant_id = p.tenant_id "
                    + "WHERE p.estado IN ('ACTIVA', 'RETIRADA') AND a.estado <> 'ACTIVO' "
                    + "AND EXISTS (SELECT 1 FROM mercado_ganado_mensajes m WHERE m.publicacion_id = p.id) ORDER BY p.id DESC LIMIT 50")) {
            sospechas.add(sospecha(r, "ANIMAL_SALIO_DEL_HATO",
                "El animal quedó " + String.valueOf(r.get("estado_animal")).toLowerCase() + " en el hato del vendedor sin cerrar el trato aquí. Negociaba con: " + r.get("comprador")));
        }
        // 3) Un comprador que preguntó por el animal ahora tiene uno con el mismo arete en su hato.
        for (Map<String, Object> r : jdbc.queryForList(
                "SELECT DISTINCT p.id, p.titulo, p.fecha_publicacion AS fecha, p.tenant_id AS vendedor_id, lv.nombre_empresa AS vendedor, "
                    + "m.comprador_tenant_id AS comprador_id, lc.nombre_empresa AS comprador, a.arete "
                    + "FROM publicaciones_venta p JOIN animales a ON a.id = p.animal_id "
                    + "JOIN mercado_ganado_mensajes m ON m.publicacion_id = p.id "
                    + "JOIN animales b ON b.tenant_id = m.comprador_tenant_id AND b.arete = a.arete AND b.id <> a.id "
                    + "LEFT JOIN licencias_tenant lv ON lv.tenant_id = p.tenant_id LEFT JOIN licencias_tenant lc ON lc.tenant_id = m.comprador_tenant_id "
                    + "WHERE NOT (p.estado = 'VENDIDA' AND p.comprador_tenant_id = m.comprador_tenant_id) ORDER BY p.id DESC LIMIT 50")) {
            sospechas.add(sospecha(r, "ARETE_EN_HATO_DEL_INTERESADO",
                r.get("comprador") + " tiene en su hato un animal con el arete " + r.get("arete") + " y no compró por el mercado"));
        }

        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("resumen", resumen);
        salida.put("alertas", alertas);
        salida.put("sospechas", sospechas);
        salida.put("suspendidas", jdbc.queryForList(
            "SELECT s.tenant_id AS \"tenantId\", l.nombre_empresa AS finca, s.motivo, s.suspendido_por AS \"suspendidoPor\", s.fecha "
                + "FROM mercado_ganado_suspensiones s LEFT JOIN licencias_tenant l ON l.tenant_id = s.tenant_id ORDER BY s.fecha DESC"));
        return salida;
    }

    public static class SuspensionRequest {
        public String motivo;
    }

    /** Saca a una finca del mercado: no puede entrar y sus publicaciones dejan de verse. El resto de Aurora sigue igual. */
    @PostMapping("/fincas/{tenantId:[0-9]+}/suspender")
    public Map<String, Object> suspender(@PathVariable Long tenantId, @RequestBody SuspensionRequest req) {
        if (req.motivo == null || req.motivo.isBlank()) throw new RuntimeException("Escribe el motivo de la suspensión");
        Integer existe = jdbc.queryForObject("SELECT COUNT(*) FROM licencias_tenant WHERE tenant_id = ?", Integer.class, tenantId);
        if (existe == null || existe == 0) throw new RuntimeException("Finca no encontrada");
        String motivo = req.motivo.trim().length() > 500 ? req.motivo.trim().substring(0, 500) : req.motivo.trim();
        jdbc.update("INSERT INTO mercado_ganado_suspensiones (tenant_id, motivo, suspendido_por, fecha) VALUES (?, ?, ?, ?) "
                + "ON CONFLICT (tenant_id) DO UPDATE SET motivo = EXCLUDED.motivo, suspendido_por = EXCLUDED.suspendido_por, fecha = EXCLUDED.fecha",
            tenantId, motivo, AuthContext.getUsername(), new Timestamp(System.currentTimeMillis()));
        return Map.of("suspendida", true);
    }

    @PostMapping("/fincas/{tenantId:[0-9]+}/reactivar")
    public Map<String, Object> reactivar(@PathVariable Long tenantId) {
        jdbc.update("DELETE FROM mercado_ganado_suspensiones WHERE tenant_id = ?", tenantId);
        return Map.of("suspendida", false);
    }

    private Map<String, Object> sospecha(Map<String, Object> r, String tipo, String detalle) {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("tipo", tipo);
        s.put("publicacionId", r.get("id"));
        s.put("titulo", r.get("titulo"));
        s.put("vendedor", r.get("vendedor"));
        s.put("vendedorTenantId", r.get("vendedor_id"));
        s.put("comprador", r.get("comprador"));
        s.put("compradorTenantId", r.get("comprador_id"));
        s.put("fecha", r.get("fecha"));
        s.put("detalle", detalle);
        return s;
    }

    private long contar(String sql, Object... params) {
        Long n = jdbc.queryForObject(sql, Long.class, params);
        return n == null ? 0 : n;
    }
}
