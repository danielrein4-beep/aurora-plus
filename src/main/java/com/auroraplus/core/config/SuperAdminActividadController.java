package com.auroraplus.core.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Actividad operativa de los tenants, vertical por vertical: qué registran
 * realmente dentro del sistema (consultas, comandas, ordeños, ventas...),
 * no lo que pagan — eso ya lo cubre /api/super-admin/tenants/analytics.
 *
 * Cuenta directo sobre las tablas de cada módulo agrupando por tenant_id. Los
 * nombres de tabla/columna son constantes de este archivo (nunca vienen del
 * request), así que el SQL armado por concatenación no es inyectable.
 *
 * Protegido por TenantInterceptor: solo un token SUPER_ADMIN llega aquí.
 */
@RestController
@RequestMapping("/api/super-admin/actividad")
public class SuperAdminActividadController {

    /** columnaFecha null = la tabla no guarda fecha de alta, solo se reporta el total acumulado. */
    private record Metrica(String clave, String etiqueta, String tabla, String columnaFecha, String columnaMonto, String filtroExtra) {
        Metrica(String clave, String etiqueta, String tabla, String columnaFecha) {
            this(clave, etiqueta, tabla, columnaFecha, null, null);
        }
    }

    private record Vertical(String id, List<String> modulosPrincipales, List<Metrica> metricas) {}

    private static final List<Vertical> VERTICALES = List.of(
        new Vertical("salud", List.of("salud", "odontologia", "estetica"), List.of(
            new Metrica("consultas", "Consultas médicas", "salud_consultas", "fecha_hora"),
            new Metrica("pacientes", "Pacientes registrados", "salud_pacientes", null),
            new Metrica("citas", "Citas agendadas", "salud_citas", "fecha"),
            new Metrica("ordenesLab", "Órdenes de laboratorio", "salud_ordenes_laboratorio", "fecha_emision"),
            new Metrica("consultasVet", "Consultas veterinarias", "consultas_veterinarias", "fecha_hora"),
            new Metrica("mascotas", "Mascotas registradas", "mascotas", null),
            new Metrica("planesOdonto", "Planes odontológicos", "salud_odontologia_planes_tratamiento", "fecha_creacion"),
            new Metrica("sesionesOdonto", "Sesiones odontológicas", "salud_odontologia_evolucion_sesiones", "fecha_sesion"),
            new Metrica("sesionesEstetica", "Sesiones de estética", "salud_estetica_sesiones", "fecha_sesion")
        )),
        new Vertical("ganaderia", List.of("ganaderia"), List.of(
            new Metrica("ordenos", "Registros de ordeño", "registros_ordeno", "fecha"),
            new Metrica("animales", "Animales en hato", "animales", null),
            new Metrica("pesajes", "Pesajes", "registros_peso", "fecha"),
            new Metrica("ventasAnimal", "Ventas de animales", "ventas_animal", "fecha", "total", null)
        )),
        new Vertical("horeca", List.of("horeca"), List.of(
            new Metrica("comandas", "Comandas", "comandas", "fecha_apertura", "total_consumo", "fecha_anulacion IS NULL"),
            new Metrica("reservas", "Reservas", "reservas_horeca", "fecha_creacion")
        )),
        new Vertical("repuestos", List.of("repuestos", "ferreteria", "comercio", "retail", "farmacia"), List.of(
            new Metrica("ventasPos", "Ventas del POS", "ventas_mostrador", "fecha_registro", "total", null),
            new Metrica("ventas", "Ventas mostrador", "ventas_comerciales", "fecha", "total_usd", null),
            new Metrica("ventasRetail", "Ventas retail", "ventas_retail", "fecha_registro", "total", null),
            new Metrica("productos", "Productos creados", "productos_comerciales", "created_at"),
            new Metrica("repuestos", "Repuestos en catálogo", "repuestos_items", null)
        )),
        new Vertical("minero", List.of("minero"), List.of(
            new Metrica("bocamina", "Registros de bocamina", "registros_bocamina", "fecha_registro"),
            new Metrica("ventasMineral", "Ventas de mineral", "ventas_mineral", "fecha", "total", null)
        )),
        new Vertical("moda", List.of("moda"), List.of(
            new Metrica("ventasModa", "Ventas", "ventas_moda", "fecha", "total", null),
            new Metrica("productosModa", "Productos en catálogo", "productos_moda", null)
        )),
        new Vertical("construccion", List.of("construccion"), List.of(
            new Metrica("proyectos", "Proyectos de obra", "proyectos_construccion", "created_at", "monto_presupuesto_total", null),
            new Metrica("valuaciones", "Valuaciones emitidas", "valuaciones_construccion", "fecha_emision", "monto_neto_a_cobrar", null),
            new Metrica("bitacora", "Entradas de bitácora", "bitacora_construccion", "fecha"),
            new Metrica("despachosObra", "Despachos a obra", "despachos_construccion", "fecha_hora_salida")
        )),
        new Vertical("logistica", List.of("logistica"), List.of(
            new Metrica("rutas", "Rutas despachadas", "rutas_transporte", "fecha_despacho", "costo_flete", null)
        )),
        new Vertical("tamanaco-comercial", List.of("tamanaco-comercial"), List.of(
            new Metrica("facturas", "Facturas emitidas", "facturas_comercial", "fecha_emision", "total", null),
            new Metrica("despachos", "Despachos", "despachos_comerciales", "fecha_despacho"),
            new Metrica("ventas", "Ventas", "ventas_comerciales", "fecha", "total_usd", null)
        ))
    );

    @Autowired
    private JdbcTemplate jdbc;

    /** Tarjetas de la portada: por vertical, cuántos negocios tiene y cuántos realmente trabajaron en el período. */
    @GetMapping("/resumen")
    public ResponseEntity<List<Map<String, Object>>> resumen(@RequestParam(defaultValue = "30") int dias) {
        LocalDateTime desde = calcularDesde(dias);
        List<Map<String, Object>> salida = new ArrayList<>();
        for (Vertical v : VERTICALES) {
            Set<Long> tenants = tenantsDeVertical(v);
            Set<Long> conActividad = new HashSet<>();
            long registrosPeriodo = 0;
            for (Metrica m : v.metricas()) {
                if (m.columnaFecha() == null) continue;
                for (Map<String, Object> fila : jdbc.queryForList(
                        "SELECT tenant_id, COUNT(*) AS n FROM " + m.tabla() + " WHERE " + m.columnaFecha() + " >= ?" + extra(m) + " GROUP BY tenant_id",
                        parametroFecha(m, desde))) {
                    Long tenantId = ((Number) fila.get("tenant_id")).longValue();
                    if (!tenants.contains(tenantId)) continue;
                    conActividad.add(tenantId);
                    registrosPeriodo += ((Number) fila.get("n")).longValue();
                }
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("vertical", v.id());
            item.put("totalTenants", tenants.size());
            item.put("tenantsConActividad", conActividad.size());
            item.put("registrosPeriodo", registrosPeriodo);
            salida.add(item);
        }
        return ResponseEntity.ok(salida);
    }

    /** Detalle de una vertical: totales por métrica, tendencia diaria y tabla por negocio. */
    @GetMapping("/{vertical}")
    public ResponseEntity<?> detalle(@PathVariable String vertical, @RequestParam(defaultValue = "30") int dias) {
        Vertical v = VERTICALES.stream().filter(x -> x.id().equals(vertical)).findFirst().orElse(null);
        if (v == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Vertical desconocida: " + vertical));
        }
        LocalDateTime desde = calcularDesde(dias);
        Set<Long> tenants = tenantsDeVertical(v);

        Map<Long, Map<String, Object>> filas = new LinkedHashMap<>();
        for (Map<String, Object> lic : jdbc.queryForList(
                "SELECT tenant_id, nombre_empresa, modulo_principal, activa, tipo_licencia, fecha_vencimiento_pago FROM licencias_tenant ORDER BY tenant_id")) {
            Long tenantId = ((Number) lic.get("tenant_id")).longValue();
            if (!tenants.contains(tenantId)) continue;
            Map<String, Object> fila = new LinkedHashMap<>();
            fila.put("tenantId", tenantId);
            fila.put("nombreEmpresa", lic.get("nombre_empresa"));
            fila.put("moduloPrincipal", lic.get("modulo_principal"));
            fila.put("activa", lic.get("activa"));
            fila.put("plan", lic.get("tipo_licencia"));
            fila.put("usuarios", 0L);
            fila.put("ultimaActividad", null);
            fila.put("metricas", new LinkedHashMap<String, Map<String, Object>>());
            filas.put(tenantId, fila);
        }
        for (Map<String, Object> u : jdbc.queryForList("SELECT tenant_id, COUNT(*) AS n FROM usuarios GROUP BY tenant_id")) {
            Map<String, Object> fila = filas.get(((Number) u.get("tenant_id")).longValue());
            if (fila != null) fila.put("usuarios", ((Number) u.get("n")).longValue());
        }

        List<Map<String, Object>> totales = new ArrayList<>();
        for (Metrica m : v.metricas()) {
            boolean conFecha = m.columnaFecha() != null;
            boolean conMonto = m.columnaMonto() != null;
            String sql = "SELECT tenant_id, COUNT(*) AS total"
                + (conFecha ? ", COUNT(*) FILTER (WHERE " + m.columnaFecha() + " >= ?) AS periodo, MAX(" + m.columnaFecha() + ") AS ultima" : "")
                + (conMonto && conFecha ? ", COALESCE(SUM(" + m.columnaMonto() + ") FILTER (WHERE " + m.columnaFecha() + " >= ?), 0) AS monto" : "")
                + " FROM " + m.tabla()
                + (m.filtroExtra() != null ? " WHERE " + m.filtroExtra() : "")
                + " GROUP BY tenant_id";
            List<Object> params = new ArrayList<>();
            if (conFecha) params.add(parametroFecha(m, desde));
            if (conMonto && conFecha) params.add(parametroFecha(m, desde));

            long sumaTotal = 0, sumaPeriodo = 0;
            BigDecimal sumaMonto = BigDecimal.ZERO;
            for (Map<String, Object> r : jdbc.queryForList(sql, params.toArray())) {
                Map<String, Object> fila = filas.get(((Number) r.get("tenant_id")).longValue());
                if (fila == null) continue;
                long total = ((Number) r.get("total")).longValue();
                long periodo = conFecha ? ((Number) r.get("periodo")).longValue() : 0;
                BigDecimal monto = conMonto && conFecha ? toBigDecimal(r.get("monto")) : null;
                sumaTotal += total;
                sumaPeriodo += periodo;
                if (monto != null) sumaMonto = sumaMonto.add(monto);

                Map<String, Object> valor = new LinkedHashMap<>();
                valor.put("total", total);
                valor.put("periodo", conFecha ? periodo : null);
                valor.put("monto", monto);
                @SuppressWarnings("unchecked")
                Map<String, Map<String, Object>> metricasFila = (Map<String, Map<String, Object>>) fila.get("metricas");
                metricasFila.put(m.clave(), valor);

                if (conFecha) actualizarUltima(fila, r.get("ultima"));
            }
            Map<String, Object> t = new LinkedHashMap<>();
            t.put("clave", m.clave());
            t.put("etiqueta", m.etiqueta());
            t.put("conFecha", conFecha);
            t.put("total", sumaTotal);
            t.put("periodo", conFecha ? sumaPeriodo : null);
            t.put("monto", conMonto ? sumaMonto : null);
            totales.add(t);
        }

        // Tendencia diaria de la métrica principal (la primera con fecha).
        Metrica principal = v.metricas().stream().filter(m -> m.columnaFecha() != null).findFirst().orElseThrow();
        Map<LocalDate, Long> porDia = new TreeMap<>();
        for (LocalDate d = desde.toLocalDate(); !d.isAfter(LocalDate.now()); d = d.plusDays(1)) porDia.put(d, 0L);
        for (Map<String, Object> r : jdbc.queryForList(
                "SELECT tenant_id, CAST(" + principal.columnaFecha() + " AS date) AS dia, COUNT(*) AS n FROM " + principal.tabla()
                    + " WHERE " + principal.columnaFecha() + " >= ?" + extra(principal) + " GROUP BY tenant_id, dia",
                parametroFecha(principal, desde))) {
            if (!tenants.contains(((Number) r.get("tenant_id")).longValue())) continue;
            LocalDate dia = ((java.sql.Date) r.get("dia")).toLocalDate();
            porDia.computeIfPresent(dia, (k, n) -> n + ((Number) r.get("n")).longValue());
        }
        List<Map<String, Object>> serie = new ArrayList<>();
        porDia.forEach((dia, n) -> serie.add(Map.of("fecha", dia.toString(), "cantidad", n)));

        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("vertical", v.id());
        salida.put("dias", dias);
        salida.put("metricaPrincipal", principal.etiqueta());
        salida.put("totales", totales);
        salida.put("serie", serie);
        salida.put("tenants", new ArrayList<>(filas.values()));
        return ResponseEntity.ok(salida);
    }

    /** Actividad de UN negocio en todas las tablas conocidas (para su ficha): solo métricas donde tiene registros. */
    @GetMapping("/tenant/{tenantId:[0-9]+}")
    public ResponseEntity<Map<String, Object>> actividadTenant(@PathVariable Long tenantId, @RequestParam(defaultValue = "30") int dias) {
        LocalDateTime desde = calcularDesde(dias);
        Set<String> tablasVistas = new HashSet<>();
        List<Map<String, Object>> metricas = new ArrayList<>();
        Map<String, Object> fila = new HashMap<>();
        for (Vertical v : VERTICALES) {
            for (Metrica m : v.metricas()) {
                if (!tablasVistas.add(m.tabla())) continue;
                boolean conFecha = m.columnaFecha() != null;
                boolean conMonto = conFecha && m.columnaMonto() != null;
                String sql = "SELECT COUNT(*) AS total"
                    + (conFecha ? ", COUNT(*) FILTER (WHERE " + m.columnaFecha() + " >= ?) AS periodo, MAX(" + m.columnaFecha() + ") AS ultima" : "")
                    + (conMonto ? ", COALESCE(SUM(" + m.columnaMonto() + ") FILTER (WHERE " + m.columnaFecha() + " >= ?), 0) AS monto" : "")
                    + " FROM " + m.tabla() + " WHERE tenant_id = ?" + extra(m);
                List<Object> params = new ArrayList<>();
                if (conFecha) params.add(parametroFecha(m, desde));
                if (conMonto) params.add(parametroFecha(m, desde));
                params.add(tenantId);
                Map<String, Object> r = jdbc.queryForMap(sql, params.toArray());
                long total = ((Number) r.get("total")).longValue();
                if (total == 0) continue;
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("vertical", v.id());
                item.put("clave", m.clave());
                item.put("etiqueta", m.etiqueta());
                item.put("conFecha", conFecha);
                item.put("total", total);
                item.put("periodo", conFecha ? ((Number) r.get("periodo")).longValue() : null);
                item.put("monto", conMonto ? toBigDecimal(r.get("monto")) : null);
                metricas.add(item);
                if (conFecha) actualizarUltima(fila, r.get("ultima"));
            }
        }
        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("tenantId", tenantId);
        salida.put("dias", dias);
        salida.put("ultimaActividad", fila.get("ultimaActividad"));
        salida.put("metricas", metricas);
        return ResponseEntity.ok(salida);
    }

    private LocalDateTime calcularDesde(int dias) {
        int acotado = Math.max(1, Math.min(dias, 3650));
        return LocalDate.now().minusDays(acotado - 1L).atStartOfDay();
    }

    /** Tenants de la vertical por su módulo principal, más cualquier otro que tenga registros en sus tablas (p. ej. un comercio con el módulo de salud contratado aparte). */
    private Set<Long> tenantsDeVertical(Vertical v) {
        Set<Long> ids = new TreeSet<>();
        String marcadores = String.join(",", Collections.nCopies(v.modulosPrincipales().size(), "?"));
        ids.addAll(jdbc.queryForList(
            "SELECT tenant_id FROM licencias_tenant WHERE modulo_principal IN (" + marcadores + ")",
            Long.class, v.modulosPrincipales().toArray()));
        Set<String> tablas = new LinkedHashSet<>();
        v.metricas().forEach(m -> tablas.add(m.tabla()));
        for (String tabla : tablas) {
            ids.addAll(jdbc.queryForList("SELECT DISTINCT tenant_id FROM " + tabla + " WHERE tenant_id IS NOT NULL", Long.class));
        }
        // Solo negocios que existen de verdad en el directorio.
        Set<Long> existentes = new HashSet<>(jdbc.queryForList("SELECT tenant_id FROM licencias_tenant", Long.class));
        ids.retainAll(existentes);
        return ids;
    }

    private static String extra(Metrica m) {
        return m.filtroExtra() != null ? " AND " + m.filtroExtra() : "";
    }

    /** Las columnas DATE se comparan contra una fecha; las TIMESTAMP contra un instante. */
    private Object parametroFecha(Metrica m, LocalDateTime desde) {
        return esColumnaDate(m) ? java.sql.Date.valueOf(desde.toLocalDate()) : Timestamp.valueOf(desde);
    }

    private static boolean esColumnaDate(Metrica m) {
        return switch (m.tabla() + "." + m.columnaFecha()) {
            case "salud_citas.fecha", "salud_odontologia_evolucion_sesiones.fecha_sesion", "salud_estetica_sesiones.fecha_sesion", "registros_ordeno.fecha",
                 "registros_peso.fecha", "facturas_comercial.fecha_emision",
                 "valuaciones_construccion.fecha_emision", "bitacora_construccion.fecha" -> true;
            default -> false;
        };
    }

    private static void actualizarUltima(Map<String, Object> fila, Object valor) {
        if (valor == null) return;
        LocalDateTime candidata = valor instanceof Timestamp ts ? ts.toLocalDateTime()
            : valor instanceof java.sql.Date d ? d.toLocalDate().atStartOfDay() : null;
        if (candidata == null || candidata.isAfter(LocalDateTime.now().plusDays(1))) return;
        Object actual = fila.get("ultimaActividad");
        if (actual == null || candidata.isAfter(LocalDateTime.parse((String) actual))) {
            fila.put("ultimaActividad", candidata.toString());
        }
    }

    private static BigDecimal toBigDecimal(Object o) {
        if (o == null) return BigDecimal.ZERO;
        if (o instanceof BigDecimal b) return b;
        return new BigDecimal(o.toString());
    }
}
