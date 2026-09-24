package com.auroraplus.core.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Página dedicada de cada vertical en el super-admin: cuántos negocios tiene,
 * cuánto se usan, cuánto pagan, cómo evolucionan mes a mes y la lista de
 * negocios para controlarlos. Más un endpoint de operación propio para las
 * verticales con datos particulares (restaurantes, ganadería, odontología).
 *
 * Un negocio pertenece a una vertical por su módulo principal. Los módulos y
 * los nombres de tabla/columna son constantes de este archivo, nunca vienen
 * del request, así que el SQL armado por concatenación no es inyectable.
 *
 * Solo lectura; protegido por TenantInterceptor / PermisosSuperAdmin.
 */
@RestController
@RequestMapping("/api/super-admin/verticales")
public class SuperAdminVerticalesController {

    /** colSuma/unidadSuma: además de contar, suma una columna (dinero, litros...). colFecha null = solo total acumulado. */
    private record Metrica(String clave, String etiqueta, String tabla, String colFecha, String colSuma, String unidadSuma, String filtro) {
        Metrica(String clave, String etiqueta, String tabla, String colFecha) { this(clave, etiqueta, tabla, colFecha, null, null, null); }
    }

    private record Vertical(String id, String nombre, List<String> modulos, List<Metrica> metricas) {}

    private static final List<Vertical> VERTICALES = List.of(
        new Vertical("mediclinic", "Mediclinic", List.of("salud"), List.of(
            new Metrica("consultas", "Consultas", "salud_consultas", "fecha_hora"),
            new Metrica("citas", "Citas", "salud_citas", "fecha"),
            new Metrica("cobros", "Cobros de consultas", "salud_cobros_consulta", "fecha_hora", "monto_total", "USD",
                "COALESCE(UPPER(moneda_cobrada), 'USD') IN ('USD','USDT')"),
            new Metrica("ordenesLab", "Órdenes de laboratorio", "salud_ordenes_laboratorio", "fecha_emision"),
            new Metrica("pacientes", "Pacientes", "salud_pacientes", null)
        )),
        new Vertical("odontologia", "Odontología", List.of("odontologia"), List.of(
            new Metrica("sesiones", "Sesiones clínicas", "salud_odontologia_evolucion_sesiones", "fecha_sesion"),
            new Metrica("planes", "Planes de tratamiento", "salud_odontologia_planes_tratamiento", "fecha_creacion", "monto_total_usd", "USD", null),
            new Metrica("abonos", "Abonos cobrados", "salud_odontologia_plan_abonos", "fecha_registro", "monto_usd", "USD", null),
            new Metrica("consultas", "Consultas", "salud_consultas", "fecha_hora"),
            new Metrica("pacientes", "Pacientes", "salud_pacientes", null)
        )),
        new Vertical("restaurantes", "Restaurantes", List.of("horeca"), List.of(
            new Metrica("comandas", "Comandas", "comandas", "fecha_apertura", "total_consumo", "USD", "fecha_anulacion IS NULL"),
            new Metrica("platos", "Platos vendidos", "items_comanda", "fecha_creacion", "cantidad", "unidades", "fecha_anulacion IS NULL"),
            new Metrica("reservas", "Reservas", "reservas_horeca", "fecha_creacion")
        )),
        new Vertical("comercio", "Comercio", List.of("repuestos", "ferreteria", "comercio", "retail", "farmacia"), List.of(
            new Metrica("ventasMostrador", "Ventas de mostrador", "ventas_mostrador", "fecha_registro", "total", "USD", null),
            new Metrica("ventas", "Ventas comerciales", "ventas_comerciales", "fecha", "total_usd", "USD", null),
            new Metrica("ventasRetail", "Ventas retail", "ventas_retail", "fecha_registro", "total", "USD", null),
            new Metrica("productos", "Productos creados", "productos_comerciales", "created_at")
        )),
        new Vertical("ganaderia", "Ganadería", List.of("ganaderia"), List.of(
            new Metrica("leche", "Leche ordeñada", "registros_ordeno", "fecha", "cantidad_litros", "litros", null),
            new Metrica("ventasAnimal", "Ventas de animales", "ventas_animal", "fecha", "total", "USD", null),
            new Metrica("pesajes", "Pesajes", "registros_peso", "fecha"),
            new Metrica("animales", "Animales en hato", "animales", null)
        )),
        new Vertical("estetica", "Estética", List.of("estetica"), List.of(
            new Metrica("sesiones", "Sesiones", "salud_estetica_sesiones", "fecha_sesion", "valor", "USD", null),
            new Metrica("paquetes", "Paquetes vendidos", "salud_estetica_paquetes", "fecha_compra", "precio", "USD", null),
            new Metrica("productos", "Venta de productos", "salud_estetica_ventas_productos", "fecha", "total", "USD", null)
        )),
        new Vertical("mineria", "Minería", List.of("minero"), List.of(
            new Metrica("bocamina", "Registros de bocamina", "registros_bocamina", "fecha_registro"),
            new Metrica("ventasMineral", "Ventas de mineral", "ventas_mineral", "fecha", "total", "USD", null)
        )),
        new Vertical("moda", "Moda", List.of("moda"), List.of(
            new Metrica("ventasModa", "Ventas", "ventas_moda", "fecha", "total", "USD", null),
            new Metrica("productosModa", "Productos en catálogo", "productos_moda", null)
        )),
        new Vertical("tamanaco", "Tamanaco Enterprise", List.of("tamanaco-comercial"), List.of(
            new Metrica("facturas", "Facturas emitidas", "facturas_comercial", "fecha_emision", "total", "USD", null),
            new Metrica("despachos", "Despachos", "despachos_comerciales", "fecha_despacho"),
            new Metrica("ventas", "Ventas", "ventas_comerciales", "fecha", "total_usd", "USD", null)
        ))
    );

    /** Sin uso en más de estos días (con licencia activa) = en riesgo de abandono. */
    private static final int DIAS_RIESGO = 14;
    private static final String PAGOS_VALIDOS = "estado = 'CONFIRMADO' AND (moneda IS NULL OR UPPER(moneda) IN ('USD','USDT'))";

    @Autowired
    private JdbcTemplate jdbc;

    /** Panorama: una fila por vertical para comparar y saltar a su página. */
    @GetMapping
    public List<Map<String, Object>> panorama(@RequestParam(defaultValue = "30") int dias) {
        LocalDateTime desde = desde(dias);
        List<Map<String, Object>> salida = new ArrayList<>();
        for (Vertical v : VERTICALES) {
            Map<Long, Map<String, Object>> negocios = cargarNegocios(v);
            Map<Long, LocalDateTime> ultima = new HashMap<>();
            long registros = 0;
            for (Metrica m : v.metricas()) {
                if (m.colFecha() == null || !tablaExiste(m.tabla())) continue;
                for (Map<String, Object> r : jdbc.queryForList(
                        "SELECT tenant_id, COUNT(*) FILTER (WHERE " + m.colFecha() + " >= ?) AS periodo, MAX(" + m.colFecha() + ") FILTER (WHERE "
                            + m.colFecha() + " <= CURRENT_TIMESTAMP) AS ultima FROM " + m.tabla() + " WHERE " + enVertical(v) + filtro(m) + " GROUP BY tenant_id",
                        Timestamp.valueOf(desde))) {
                    registros += num(r.get("periodo"));
                    fusionarUltima(ultima, id(r), r.get("ultima"));
                }
            }
            long activos = negocios.values().stream().filter(n -> Boolean.TRUE.equals(n.get("activa"))).count();
            long conActividad = ultima.values().stream().filter(u -> !u.isBefore(desde)).count();
            long enRiesgo = negocios.values().stream().filter(n -> Boolean.TRUE.equals(n.get("activa")) && enRiesgo(ultima.get(id(n)))).count();
            Map<String, Object> fila = new LinkedHashMap<>();
            fila.put("id", v.id());
            fila.put("nombre", v.nombre());
            fila.put("negocios", negocios.size());
            fila.put("activos", activos);
            fila.put("conActividad", conActividad);
            fila.put("enRiesgo", enRiesgo);
            fila.put("registrosPeriodo", registros);
            fila.put("ingresosPeriodo", ingresos(v, desde));
            salida.add(fila);
        }
        return salida;
    }

    /** Página de una vertical: números clave, series de 12 meses, métricas y negocios. */
    @GetMapping("/{verticalId}")
    public Map<String, Object> detalle(@PathVariable String verticalId, @RequestParam(defaultValue = "30") int dias) {
        Vertical v = buscar(verticalId);
        LocalDateTime desde = desde(dias);
        List<String> meses = ultimos12Meses();
        LocalDateTime inicioSerie = YearMonth.parse(meses.get(0)).atDay(1).atStartOfDay();

        Map<Long, Map<String, Object>> negocios = cargarNegocios(v);
        Map<Long, LocalDateTime> ultima = new HashMap<>();

        List<Map<String, Object>> metricas = new ArrayList<>();
        for (Metrica m : v.metricas()) {
            if (!tablaExiste(m.tabla())) continue;
            boolean conFecha = m.colFecha() != null;
            boolean conSuma = conFecha && m.colSuma() != null;
            long total = 0, periodo = 0;
            BigDecimal sumaTotal = BigDecimal.ZERO, sumaPeriodo = BigDecimal.ZERO;

            String sql = "SELECT tenant_id, COUNT(*) AS total"
                + (conFecha ? ", COUNT(*) FILTER (WHERE " + m.colFecha() + " >= ?) AS periodo, MAX(" + m.colFecha() + ") FILTER (WHERE "
                    + m.colFecha() + " <= CURRENT_TIMESTAMP) AS ultima" : "")
                + (conSuma ? ", COALESCE(SUM(" + m.colSuma() + "), 0) AS suma_total, COALESCE(SUM(" + m.colSuma() + ") FILTER (WHERE "
                    + m.colFecha() + " >= ?), 0) AS suma_periodo" : "")
                + " FROM " + m.tabla() + " WHERE " + enVertical(v) + filtro(m) + " GROUP BY tenant_id";
            List<Object> params = new ArrayList<>();
            if (conFecha) params.add(Timestamp.valueOf(desde));
            if (conSuma) params.add(Timestamp.valueOf(desde));
            for (Map<String, Object> r : jdbc.queryForList(sql, params.toArray())) {
                Map<String, Object> n = negocios.get(id(r));
                if (n == null) continue;
                Map<String, Object> valor = new LinkedHashMap<>();
                valor.put("total", num(r.get("total")));
                total += num(r.get("total"));
                if (conFecha) {
                    valor.put("periodo", num(r.get("periodo")));
                    periodo += num(r.get("periodo"));
                    fusionarUltima(ultima, id(r), r.get("ultima"));
                }
                if (conSuma) {
                    BigDecimal sp = dec(r.get("suma_periodo"));
                    valor.put("sumaPeriodo", sp);
                    sumaPeriodo = sumaPeriodo.add(sp);
                    sumaTotal = sumaTotal.add(dec(r.get("suma_total")));
                }
                metricasDe(n).put(m.clave(), valor);
            }

            long[] serie = new long[12];
            BigDecimal[] serieSuma = conSuma ? ceros(12) : null;
            if (conFecha) {
                for (Map<String, Object> r : jdbc.queryForList(
                        "SELECT to_char(" + m.colFecha() + ", 'YYYY-MM') AS mes, COUNT(*) AS n"
                            + (conSuma ? ", COALESCE(SUM(" + m.colSuma() + "), 0) AS s" : "")
                            + " FROM " + m.tabla() + " WHERE " + m.colFecha() + " >= ? AND " + m.colFecha() + " <= CURRENT_TIMESTAMP AND "
                            + enVertical(v) + filtro(m) + " GROUP BY mes", Timestamp.valueOf(inicioSerie))) {
                    int i = meses.indexOf((String) r.get("mes"));
                    if (i < 0) continue;
                    serie[i] = num(r.get("n"));
                    if (conSuma) serieSuma[i] = dec(r.get("s"));
                }
            }

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("clave", m.clave());
            item.put("etiqueta", m.etiqueta());
            item.put("conFecha", conFecha);
            item.put("total", total);
            item.put("periodo", conFecha ? periodo : null);
            item.put("unidadSuma", conSuma ? m.unidadSuma() : null);
            item.put("sumaPeriodo", conSuma ? sumaPeriodo : null);
            item.put("sumaTotal", conSuma ? sumaTotal : null);
            item.put("serie", conFecha ? serie : null);
            item.put("serieSuma", serieSuma);
            metricas.add(item);
        }

        // Ingresos SaaS de la vertical (lo que estos negocios le pagan a Aurora).
        BigDecimal[] serieIngresos = ceros(12);
        for (Map<String, Object> r : jdbc.queryForList(
                "SELECT to_char(fecha_pago, 'YYYY-MM') AS mes, COALESCE(SUM(monto), 0) AS s FROM pagos_suscripcion_tenant WHERE "
                    + PAGOS_VALIDOS + " AND fecha_pago >= ? AND " + enVertical(v) + " GROUP BY mes", Timestamp.valueOf(inicioSerie))) {
            int i = meses.indexOf((String) r.get("mes"));
            if (i >= 0) serieIngresos[i] = dec(r.get("s"));
        }
        for (Map<String, Object> r : jdbc.queryForList(
                "SELECT tenant_id, COALESCE(SUM(monto), 0) AS s FROM pagos_suscripcion_tenant WHERE " + PAGOS_VALIDOS + " AND "
                    + enVertical(v) + " GROUP BY tenant_id")) {
            Map<String, Object> n = negocios.get(id(r));
            if (n != null) n.put("ingresosHistorico", dec(r.get("s")));
        }

        // Altas de negocios por mes.
        long[] serieAltas = new long[12];
        long altasPeriodo = 0;
        for (Map<String, Object> n : negocios.values()) {
            LocalDate alta = (LocalDate) n.get("fechaAltaFecha");
            if (alta == null) continue;
            if (!alta.atStartOfDay().isBefore(desde)) altasPeriodo++;
            int i = meses.indexOf(YearMonth.from(alta).toString());
            if (i >= 0) serieAltas[i]++;
        }

        // Estado de cada negocio.
        LocalDate hoy = LocalDate.now();
        long activos = 0, suspendidos = 0, porVencer = 0, conActividad = 0, enRiesgo = 0, usuarios = 0;
        for (Map<String, Object> n : negocios.values()) {
            boolean activa = Boolean.TRUE.equals(n.get("activa"));
            LocalDateTime u = ultima.get(id(n));
            n.put("ultimaActividad", u != null ? u.toString() : null);
            LocalDate vence = (LocalDate) n.remove("vencimientoFecha");
            n.remove("fechaAltaFecha");
            Long diasRestantes = vence != null ? ChronoUnit.DAYS.between(hoy, vence) : null;
            n.put("diasRestantes", diasRestantes);
            boolean riesgo = activa && enRiesgo(u);
            n.put("enRiesgo", riesgo);
            if (activa) activos++; else suspendidos++;
            if (activa && diasRestantes != null && diasRestantes >= 0 && diasRestantes <= 7) porVencer++;
            if (u != null && !u.isBefore(desde)) conActividad++;
            if (riesgo) enRiesgo++;
            usuarios += num(n.get("usuarios"));
            n.putIfAbsent("ingresosHistorico", BigDecimal.ZERO);
        }

        Map<String, Object> kpis = new LinkedHashMap<>();
        kpis.put("negocios", negocios.size());
        kpis.put("activos", activos);
        kpis.put("suspendidos", suspendidos);
        kpis.put("porVencer", porVencer);
        kpis.put("conActividad", conActividad);
        kpis.put("enRiesgo", enRiesgo);
        kpis.put("usuarios", usuarios);
        kpis.put("altasPeriodo", altasPeriodo);
        kpis.put("ingresosPeriodo", ingresos(v, desde));
        kpis.put("ingresosHistorico", Arrays.stream(negocios.values().toArray())
            .map(n -> (BigDecimal) ((Map<?, ?>) n).get("ingresosHistorico")).reduce(BigDecimal.ZERO, BigDecimal::add));

        List<Map<String, Object>> lista = new ArrayList<>(negocios.values());
        lista.sort(Comparator.comparing((Map<String, Object> n) -> (String) n.getOrDefault("ultimaActividad", ""),
            Comparator.nullsFirst(Comparator.naturalOrder())).reversed());

        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("id", v.id());
        salida.put("nombre", v.nombre());
        salida.put("modulos", v.modulos());
        salida.put("dias", dias);
        salida.put("meses", meses);
        salida.put("kpis", kpis);
        salida.put("serieIngresos", serieIngresos);
        salida.put("serieAltas", serieAltas);
        salida.put("metricas", metricas);
        salida.put("negocios", lista);
        return salida;
    }

    // ───────────────────── Operación propia de cada vertical ─────────────────────

    @GetMapping("/restaurantes/operacion")
    public Map<String, Object> operacionRestaurantes(@RequestParam(defaultValue = "30") int dias) {
        Vertical v = buscar("restaurantes");
        Timestamp desde = Timestamp.valueOf(desde(dias));
        String base = " FROM comandas WHERE fecha_anulacion IS NULL AND fecha_apertura >= ? AND " + enVertical(v);

        long[] porHora = new long[24];
        BigDecimal[] ventasPorHora = ceros(24);
        for (Map<String, Object> r : jdbc.queryForList("SELECT CAST(EXTRACT(HOUR FROM fecha_apertura) AS INT) AS h, COUNT(*) AS n, COALESCE(SUM(total_consumo),0) AS s" + base + " GROUP BY h", desde)) {
            int h = (int) num(r.get("h"));
            porHora[h] = num(r.get("n"));
            ventasPorHora[h] = dec(r.get("s"));
        }
        long[] porDia = new long[7];
        for (Map<String, Object> r : jdbc.queryForList("SELECT CAST(EXTRACT(ISODOW FROM fecha_apertura) AS INT) AS d, COUNT(*) AS n" + base + " GROUP BY d", desde)) {
            porDia[(int) num(r.get("d")) - 1] = num(r.get("n"));
        }
        Map<String, Object> ticket = jdbc.queryForMap("SELECT COUNT(*) AS n, COALESCE(SUM(total_consumo),0) AS s, COALESCE(AVG(NULLIF(total_consumo,0)),0) AS prom" + base, desde);

        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("comandas", num(ticket.get("n")));
        salida.put("ventas", dec(ticket.get("s")));
        salida.put("ticketPromedio", dec(ticket.get("prom")).setScale(2, RoundingMode.HALF_UP));
        salida.put("porHora", porHora);
        salida.put("ventasPorHora", ventasPorHora);
        salida.put("porDiaSemana", porDia);
        salida.put("canales", conteo("SELECT COALESCE(NULLIF(canal,''),'SALON') AS etiqueta, COUNT(*) AS n" + base + " GROUP BY etiqueta ORDER BY n DESC", desde));
        salida.put("metodosPago", conteo("SELECT COALESCE(NULLIF(metodo_pago,''),'SIN REGISTRAR') AS etiqueta, COUNT(*) AS n" + base + " GROUP BY etiqueta ORDER BY n DESC", desde));
        salida.put("topPlatos", jdbc.queryForList(
            "SELECT nombre_plato AS nombre, COALESCE(SUM(cantidad),0) AS cantidad, COALESCE(SUM(cantidad * precio_unitario),0) AS ventas FROM items_comanda "
                + "WHERE fecha_anulacion IS NULL AND fecha_creacion >= ? AND " + enVertical(v) + " GROUP BY nombre_plato ORDER BY cantidad DESC LIMIT 10", desde));
        salida.put("topRestaurantes", jdbc.queryForList(
            "SELECT c.tenant_id AS \"tenantId\", l.nombre_empresa AS nombre, COUNT(*) AS comandas, COALESCE(SUM(c.total_consumo),0) AS ventas "
                + "FROM comandas c JOIN licencias_tenant l ON l.tenant_id = c.tenant_id WHERE c.fecha_anulacion IS NULL AND c.fecha_apertura >= ? AND c."
                + enVertical(v) + " GROUP BY c.tenant_id, l.nombre_empresa ORDER BY ventas DESC LIMIT 10", desde));
        return salida;
    }

    @GetMapping("/ganaderia/produccion")
    public Map<String, Object> produccionGanaderia(@RequestParam(defaultValue = "30") int dias) {
        Vertical v = buscar("ganaderia");
        Date desde = java.sql.Date.valueOf(desde(dias).toLocalDate());
        Map<String, Object> leche = jdbc.queryForMap(
            "SELECT COALESCE(SUM(cantidad_litros),0) AS litros, COUNT(*) AS ordenos, COALESCE(AVG(cantidad_litros),0) AS prom, "
                + "COALESCE(AVG(NULLIF(porcentaje_grasa,0)),0) AS grasa, COALESCE(AVG(NULLIF(porcentaje_proteina,0)),0) AS proteina, "
                + "COUNT(DISTINCT animal_id) AS vacas FROM registros_ordeno WHERE fecha >= ? AND " + enVertical(v), desde);
        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("litros", dec(leche.get("litros")).setScale(1, RoundingMode.HALF_UP));
        salida.put("ordenos", num(leche.get("ordenos")));
        salida.put("promedioPorOrdeno", dec(leche.get("prom")).setScale(2, RoundingMode.HALF_UP));
        salida.put("grasaPromedio", dec(leche.get("grasa")).setScale(2, RoundingMode.HALF_UP));
        salida.put("proteinaPromedio", dec(leche.get("proteina")).setScale(2, RoundingMode.HALF_UP));
        salida.put("vacasOrdenadas", num(leche.get("vacas")));
        salida.put("hatoPorEstado", conteo("SELECT COALESCE(NULLIF(estado,''),'SIN ESTADO') AS etiqueta, COUNT(*) AS n FROM animales WHERE " + enVertical(v) + " GROUP BY etiqueta ORDER BY n DESC"));
        salida.put("hatoPorSexo", conteo("SELECT COALESCE(NULLIF(sexo,''),'SIN DATO') AS etiqueta, COUNT(*) AS n FROM animales WHERE " + enVertical(v) + " GROUP BY etiqueta ORDER BY n DESC"));
        salida.put("hatoPorTipo", conteo("SELECT COALESCE(NULLIF(tipo_animal,''),'SIN TIPO') AS etiqueta, COUNT(*) AS n FROM animales WHERE " + enVertical(v) + " GROUP BY etiqueta ORDER BY n DESC LIMIT 8"));
        salida.put("topFincas", jdbc.queryForList(
            "SELECT o.tenant_id AS \"tenantId\", l.nombre_empresa AS nombre, COALESCE(SUM(o.cantidad_litros),0) AS litros, COUNT(*) AS ordenos "
                + "FROM registros_ordeno o JOIN licencias_tenant l ON l.tenant_id = o.tenant_id WHERE o.fecha >= ? AND o." + enVertical(v)
                + " GROUP BY o.tenant_id, l.nombre_empresa ORDER BY litros DESC LIMIT 10", desde));
        return salida;
    }

    @GetMapping("/odontologia/clinica")
    public Map<String, Object> clinicaOdontologia(@RequestParam(defaultValue = "30") int dias) {
        Vertical v = buscar("odontologia");
        Timestamp desde = Timestamp.valueOf(desde(dias));
        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("planesPorEstado", jdbc.queryForList(
            "SELECT COALESCE(NULLIF(estado,''),'SIN ESTADO') AS etiqueta, COUNT(*) AS n, COALESCE(SUM(monto_total_usd),0) AS monto, "
                + "COALESCE(SUM(monto_pagado_usd),0) AS pagado FROM salud_odontologia_planes_tratamiento WHERE " + enVertical(v) + " GROUP BY etiqueta ORDER BY n DESC"));
        Map<String, Object> cartera = jdbc.queryForMap(
            "SELECT COALESCE(SUM(monto_total_usd),0) AS total, COALESCE(SUM(monto_pagado_usd),0) AS pagado FROM salud_odontologia_planes_tratamiento WHERE " + enVertical(v));
        salida.put("carteraTotal", dec(cartera.get("total")));
        salida.put("carteraPagada", dec(cartera.get("pagado")));
        salida.put("topProcedimientos", conteo(
            "SELECT COALESCE(NULLIF(procedimiento_realizado,''),'SIN DETALLE') AS etiqueta, COUNT(*) AS n FROM salud_odontologia_evolucion_sesiones "
                + "WHERE fecha_sesion >= ? AND " + enVertical(v) + " GROUP BY etiqueta ORDER BY n DESC LIMIT 10", java.sql.Date.valueOf(desde.toLocalDateTime().toLocalDate())));
        return salida;
    }

    // ───────────────────────────── utilidades ─────────────────────────────

    private Vertical buscar(String id) {
        return VERTICALES.stream().filter(x -> x.id().equals(id)).findFirst()
            .orElseThrow(() -> new RuntimeException("Vertical desconocida: " + id));
    }

    /** Condición SQL "este negocio es de la vertical" (módulos constantes, no vienen del request). */
    private static String enVertical(Vertical v) {
        return "tenant_id IN (SELECT tenant_id FROM licencias_tenant WHERE modulo_principal IN ("
            + v.modulos().stream().map(m -> "'" + m + "'").collect(Collectors.joining(",")) + "))";
    }

    private static String filtro(Metrica m) {
        return m.filtro() != null ? " AND " + m.filtro() : "";
    }

    private Map<Long, Map<String, Object>> cargarNegocios(Vertical v) {
        Map<Long, Map<String, Object>> negocios = new LinkedHashMap<>();
        for (Map<String, Object> r : jdbc.queryForList(
                "SELECT l.tenant_id, l.nombre_empresa, l.modulo_principal, l.tipo_licencia, l.activa, l.fecha_vencimiento_pago, l.fecha_alta, "
                    + "l.email_contacto, (SELECT COUNT(*) FROM usuarios u WHERE u.tenant_id = l.tenant_id) AS usuarios "
                    + "FROM licencias_tenant l WHERE l." + enVertical(v) + " ORDER BY l.tenant_id")) {
            Map<String, Object> n = new LinkedHashMap<>();
            n.put("tenantId", id(r));
            n.put("nombre", r.get("nombre_empresa"));
            n.put("modulo", r.get("modulo_principal"));
            n.put("plan", r.get("tipo_licencia"));
            n.put("activa", r.get("activa"));
            n.put("email", r.get("email_contacto"));
            n.put("vencimiento", r.get("fecha_vencimiento_pago") != null ? r.get("fecha_vencimiento_pago").toString() : null);
            n.put("vencimientoFecha", r.get("fecha_vencimiento_pago") instanceof java.sql.Date d ? d.toLocalDate() : null);
            n.put("fechaAltaFecha", r.get("fecha_alta") instanceof java.sql.Date d ? d.toLocalDate() : null);
            n.put("usuarios", num(r.get("usuarios")));
            n.put("metricas", new LinkedHashMap<String, Object>());
            negocios.put(id(r), n);
        }
        return negocios;
    }

    private BigDecimal ingresos(Vertical v, LocalDateTime desde) {
        return dec(jdbc.queryForObject("SELECT COALESCE(SUM(monto),0) FROM pagos_suscripcion_tenant WHERE " + PAGOS_VALIDOS
            + " AND fecha_pago >= ? AND " + enVertical(v), Object.class, Timestamp.valueOf(desde)));
    }

    private final Map<String, Boolean> tablasExistentes = new HashMap<>();

    /** Algunas verticales aún no tienen todas sus tablas en todos los entornos. */
    private boolean tablaExiste(String tabla) {
        return tablasExistentes.computeIfAbsent(tabla, t -> Boolean.TRUE.equals(jdbc.queryForObject(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ?)", Boolean.class, t)));
    }

    private List<Map<String, Object>> conteo(String sql, Object... params) {
        return jdbc.queryForList(sql, params);
    }

    private static boolean enRiesgo(LocalDateTime ultima) {
        return ultima == null || ultima.isBefore(LocalDateTime.now().minusDays(DIAS_RIESGO));
    }

    private static void fusionarUltima(Map<Long, LocalDateTime> ultima, Long tenantId, Object valor) {
        LocalDateTime f = valor instanceof Timestamp ts ? ts.toLocalDateTime()
            : valor instanceof java.sql.Date d ? d.toLocalDate().atStartOfDay() : null;
        if (f != null) ultima.merge(tenantId, f, (a, b) -> a.isAfter(b) ? a : b);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> metricasDe(Map<String, Object> negocio) {
        return (Map<String, Object>) negocio.get("metricas");
    }

    private static LocalDateTime desde(int dias) {
        return LocalDate.now().minusDays(Math.max(1, Math.min(dias, 3650)) - 1L).atStartOfDay();
    }

    private static List<String> ultimos12Meses() {
        YearMonth actual = YearMonth.now();
        List<String> meses = new ArrayList<>();
        for (int i = 11; i >= 0; i--) meses.add(actual.minusMonths(i).toString());
        return meses;
    }

    private static BigDecimal[] ceros(int n) {
        BigDecimal[] a = new BigDecimal[n];
        Arrays.fill(a, BigDecimal.ZERO);
        return a;
    }

    private static Long id(Map<String, Object> r) {
        Object v = r.containsKey("tenant_id") ? r.get("tenant_id") : r.get("tenantId");
        return ((Number) v).longValue();
    }

    private static long num(Object o) {
        return o == null ? 0 : ((Number) o).longValue();
    }

    private static BigDecimal dec(Object o) {
        if (o == null) return BigDecimal.ZERO;
        if (o instanceof BigDecimal b) return b;
        return new BigDecimal(o.toString());
    }
}
