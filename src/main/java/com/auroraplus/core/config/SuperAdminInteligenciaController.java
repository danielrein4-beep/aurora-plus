package com.auroraplus.core.config;

import com.auroraplus.modules.salud.services.CanalEndemicoService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Supplier;

/**
 * Inteligencia de datos del super-admin: qué pasa dentro de cada vertical
 * (comercios, clínicas), el canal endémico de una clínica concreta y la salud
 * del negocio SaaS (MRR, churn y semáforo por cliente).
 *
 * Solo lectura. Las rutas /api/super-admin/** ya exigen token de super-admin
 * (TenantInterceptor) y PermisosSuperAdmin decide qué rol entra.
 */
@RestController
@RequestMapping("/api/super-admin/inteligencia")
public class SuperAdminInteligenciaController {

    private static final List<String> MODULOS_COMERCIO = List.of("comercio", "retail", "farmacia", "ferreteria", "repuestos");
    private static final List<String> MODULOS_SALUD = List.of("salud", "odontologia");

    /** Tablas que delatan uso real del sistema, para medir actividad de cualquier vertical. */
    private static final List<String[]> FUENTES_ACTIVIDAD = List.of(
        new String[]{"core_registro_auditoria", "fecha"},
        new String[]{"movimientos_caja", "fecha_registro"},
        new String[]{"salud_consultas", "fecha_hora"},
        new String[]{"ventas_mostrador", "fecha_registro"},
        new String[]{"comandas", "fecha_apertura"},
        new String[]{"registros_ordeno", "fecha"},
        new String[]{"consultas_veterinarias", "fecha_hora"},
        new String[]{"bitacora_construccion", "created_at"}
    );

    @Autowired private JdbcTemplate jdbc;
    @Autowired private CanalEndemicoService canalEndemicoService;
    @Autowired private EntityManager entityManager;
    @Autowired private ObjectMapper objectMapper;

    // ───────────────────────────── SALUD ─────────────────────────────

    @GetMapping("/salud")
    public Map<String, Object> salud(@RequestParam(defaultValue = "30") int dias) {
        Timestamp desde = Timestamp.valueOf(desde(dias));
        Map<Long, Map<String, Object>> clinicas = new LinkedHashMap<>();
        for (Map<String, Object> lic : licencias()) {
            Long id = id(lic.get("tenant_id"));
            if (MODULOS_SALUD.contains(String.valueOf(lic.get("modulo_principal")))) clinicas.put(id, filaBase(lic));
        }
        Map<Long, Map<String, Object>> todas = licenciasPorId();
        for (Long id : consultar("SELECT DISTINCT tenant_id FROM salud_consultas", Long.class)) {
            if (!clinicas.containsKey(id) && todas.containsKey(id)) clinicas.put(id, filaBase(todas.get(id)));
        }
        clinicas.values().forEach(f -> {
            f.put("consultasPeriodo", 0L); f.put("consultasTotal", 0L); f.put("pacientes", 0L);
            f.put("medicos", 0L); f.put("ultimaConsulta", null); f.put("topDiagnosticos", new ArrayList<>());
            f.put("especialidad", null); f.put("doctor", null);
        });

        for (Map<String, Object> r : consultarFilas(
                "SELECT tenant_id, COUNT(*) AS total, COUNT(*) FILTER (WHERE fecha_hora >= ?) AS periodo, MAX(fecha_hora) AS ultima, "
                    + "COUNT(DISTINCT medico_nombre) AS medicos FROM salud_consultas GROUP BY tenant_id", desde)) {
            Map<String, Object> f = clinicas.get(id(r.get("tenant_id")));
            if (f == null) continue;
            f.put("consultasTotal", num(r.get("total")));
            f.put("consultasPeriodo", num(r.get("periodo")));
            f.put("ultimaConsulta", r.get("ultima"));
            f.put("medicos", num(r.get("medicos")));
        }
        for (Map<String, Object> r : consultarFilas("SELECT tenant_id, COUNT(*) AS n FROM salud_pacientes GROUP BY tenant_id")) {
            Map<String, Object> f = clinicas.get(id(r.get("tenant_id")));
            if (f != null) f.put("pacientes", num(r.get("n")));
        }
        for (Map<String, Object> r : consultarFilas(
                "SELECT DISTINCT ON (tenant_id) tenant_id, especialidad, doctor_nombre FROM salud_configuracion_medica ORDER BY tenant_id, id")) {
            Map<String, Object> f = clinicas.get(id(r.get("tenant_id")));
            if (f == null) continue;
            f.put("especialidad", r.get("especialidad"));
            f.put("doctor", r.get("doctor_nombre"));
        }
        for (Map<String, Object> r : consultarFilas(
                "SELECT tenant_id, diagnostico_principal_cie10 AS cie10, COUNT(*) AS n FROM salud_consultas "
                    + "WHERE fecha_hora >= ? AND diagnostico_principal_cie10 IS NOT NULL AND diagnostico_principal_cie10 <> '' "
                    + "GROUP BY tenant_id, diagnostico_principal_cie10 ORDER BY tenant_id, n DESC", desde)) {
            Map<String, Object> f = clinicas.get(id(r.get("tenant_id")));
            if (f == null) continue;
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> top = (List<Map<String, Object>>) f.get("topDiagnosticos");
            if (top.size() < 3) top.add(Map.of("cie10", r.get("cie10"), "casos", num(r.get("n"))));
        }

        List<Map<String, Object>> topRed = new ArrayList<>();
        for (Map<String, Object> r : consultarFilas(
                "SELECT diagnostico_principal_cie10 AS cie10, COUNT(*) AS n, COUNT(DISTINCT tenant_id) AS clinicas FROM salud_consultas "
                    + "WHERE fecha_hora >= ? AND diagnostico_principal_cie10 IS NOT NULL AND diagnostico_principal_cie10 <> '' "
                    + "GROUP BY diagnostico_principal_cie10 ORDER BY n DESC LIMIT 10", desde)) {
            topRed.add(Map.of("cie10", r.get("cie10"), "casos", num(r.get("n")), "clinicas", num(r.get("clinicas"))));
        }
        List<Map<String, Object>> tendencia = new ArrayList<>();
        for (Map<String, Object> r : consultarFilas(
                "SELECT CAST(fecha_hora AS date) AS dia, COUNT(*) AS n FROM salud_consultas WHERE fecha_hora >= ? GROUP BY 1 ORDER BY 1", desde)) {
            tendencia.add(Map.of("fecha", String.valueOf(r.get("dia")), "consultas", num(r.get("n"))));
        }

        List<Map<String, Object>> lista = new ArrayList<>(clinicas.values());
        lista.sort(Comparator.comparingLong((Map<String, Object> f) -> (Long) f.get("consultasPeriodo")).reversed());
        Map<String, Object> resumen = new LinkedHashMap<>();
        resumen.put("clinicas", lista.size());
        resumen.put("clinicasConActividad", lista.stream().filter(f -> (Long) f.get("consultasPeriodo") > 0).count());
        resumen.put("consultasPeriodo", lista.stream().mapToLong(f -> (Long) f.get("consultasPeriodo")).sum());
        resumen.put("pacientes", lista.stream().mapToLong(f -> (Long) f.get("pacientes")).sum());

        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("resumen", resumen);
        salida.put("topDiagnosticos", topRed);
        salida.put("tendencia", tendencia);
        salida.put("clinicas", lista);
        return salida;
    }

    @GetMapping("/salud/{tenantId:[0-9]+}/canal-endemico/diagnosticos-frecuentes")
    public List<CanalEndemicoService.DiagnosticoFrecuente> diagnosticosDeClinica(
            @PathVariable Long tenantId, @RequestParam(defaultValue = "20") int limite) {
        return comoClinica(tenantId, () -> canalEndemicoService.diagnosticosMasFrecuentes(limite));
    }

    @GetMapping("/salud/{tenantId:[0-9]+}/canal-endemico")
    public CanalEndemicoService.CanalEndemico canalDeClinica(
            @PathVariable Long tenantId, @RequestParam String cie10, @RequestParam(required = false) Integer anio) {
        int anioConsultado = anio != null ? anio : LocalDate.now().getYear();
        return comoClinica(tenantId, () -> canalEndemicoService.calcular(cie10, anioConsultado));
    }

    /**
     * Ejecuta el cálculo como si lo pidiera esa clínica: con el tenant puesto,
     * TenantFilterAspect activa el filtro de Hibernate en cada repositorio, así
     * que CanalEndemicoService devuelve solo sus datos sin tocar su código.
     */
    private <T> T comoClinica(Long tenantId, Supplier<T> calculo) {
        Long previo = TenantContext.getCurrentTenant();
        TenantContext.setCurrentTenant(tenantId);
        try {
            return calculo.get();
        } finally {
            if (previo == null) TenantContext.clear(); else TenantContext.setCurrentTenant(previo);
            entityManager.unwrap(Session.class).disableFilter("tenantFilter");
        }
    }

    // ──────────────────────────── COMERCIO ────────────────────────────

    @GetMapping("/comercio")
    public Map<String, Object> comercio(@RequestParam(defaultValue = "30") int dias) {
        Timestamp desde = Timestamp.valueOf(desde(dias));
        Map<Long, Map<String, Object>> comercios = new LinkedHashMap<>();
        for (Map<String, Object> lic : licencias()) {
            if (MODULOS_COMERCIO.contains(String.valueOf(lic.get("modulo_principal")))) comercios.put(id(lic.get("tenant_id")), filaBase(lic));
        }
        Map<Long, Map<String, Object>> todas = licenciasPorId();
        for (Long id : consultar("SELECT DISTINCT tenant_id FROM ventas_mostrador", Long.class)) {
            if (!comercios.containsKey(id) && todas.containsKey(id)) comercios.put(id, filaBase(todas.get(id)));
        }
        Map<Long, AcumuladoVentas> porComercio = new HashMap<>();
        comercios.keySet().forEach(id -> porComercio.put(id, new AcumuladoVentas()));
        AcumuladoVentas red = new AcumuladoVentas();
        for (Map<String, Object> v : consultarFilas(
                "SELECT tenant_id, fecha_registro, total, utilidad, metodo_pago, detalle_json FROM ventas_mostrador WHERE fecha_registro >= ?", desde)) {
            AcumuladoVentas acc = porComercio.get(id(v.get("tenant_id")));
            if (acc == null) continue;
            acc.sumar(v, objectMapper);
            red.sumar(v, objectMapper);
        }
        Map<Long, Long> productos = new HashMap<>();
        for (Map<String, Object> r : consultarFilas("SELECT tenant_id, COUNT(*) AS n FROM articulos GROUP BY tenant_id")) {
            productos.put(id(r.get("tenant_id")), num(r.get("n")));
        }
        Map<Long, List<String>> categorias = new HashMap<>();
        for (Map<String, Object> r : consultarFilas(
                "SELECT tenant_id, categoria, COUNT(*) AS n FROM articulos WHERE categoria IS NOT NULL AND categoria <> '' "
                    + "GROUP BY tenant_id, categoria ORDER BY tenant_id, n DESC")) {
            List<String> lista = categorias.computeIfAbsent(id(r.get("tenant_id")), k -> new ArrayList<>());
            if (lista.size() < 3) lista.add(String.valueOf(r.get("categoria")));
        }

        Map<String, Map<String, Object>> porRubro = new TreeMap<>();
        List<Map<String, Object>> lista = new ArrayList<>();
        for (Map.Entry<Long, Map<String, Object>> e : comercios.entrySet()) {
            Map<String, Object> f = e.getValue();
            AcumuladoVentas acc = porComercio.get(e.getKey());
            f.put("ventasPeriodo", acc.ventas);
            f.put("montoPeriodo", redondear(acc.monto));
            f.put("utilidadPeriodo", redondear(acc.utilidad));
            f.put("ticketPromedio", acc.ventas == 0 ? BigDecimal.ZERO : redondear(acc.monto.divide(BigDecimal.valueOf(acc.ventas), 4, RoundingMode.HALF_UP)));
            f.put("ultimaVenta", acc.ultima);
            f.put("productos", productos.getOrDefault(e.getKey(), 0L));
            f.put("categorias", categorias.getOrDefault(e.getKey(), List.of()));
            List<Map<String, Object>> top = acc.topProductos(1);
            f.put("topProducto", top.isEmpty() ? null : top.get(0).get("nombre"));
            lista.add(f);

            String rubro = String.valueOf(f.get("moduloPrincipal"));
            Map<String, Object> r = porRubro.computeIfAbsent(rubro, k -> new LinkedHashMap<>(Map.of(
                "rubro", k, "comercios", 0L, "ventas", 0L, "monto", BigDecimal.ZERO)));
            r.put("comercios", (Long) r.get("comercios") + 1);
            r.put("ventas", (Long) r.get("ventas") + acc.ventas);
            r.put("monto", redondear(((BigDecimal) r.get("monto")).add(acc.monto)));
        }
        lista.sort(Comparator.comparing((Map<String, Object> f) -> (BigDecimal) f.get("montoPeriodo")).reversed());

        Map<String, Object> resumen = new LinkedHashMap<>();
        resumen.put("comercios", lista.size());
        resumen.put("comerciosConVentas", porComercio.values().stream().filter(a -> a.ventas > 0).count());
        resumen.put("ventasPeriodo", red.ventas);
        resumen.put("montoPeriodo", redondear(red.monto));
        resumen.put("utilidadPeriodo", redondear(red.utilidad));
        resumen.put("ticketPromedio", red.ventas == 0 ? BigDecimal.ZERO : redondear(red.monto.divide(BigDecimal.valueOf(red.ventas), 4, RoundingMode.HALF_UP)));

        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("resumen", resumen);
        salida.put("porRubro", new ArrayList<>(porRubro.values()));
        salida.put("topProductos", red.topProductos(15));
        salida.put("tendencia", red.tendencia());
        salida.put("comercios", lista);
        return salida;
    }

    @GetMapping("/comercio/{tenantId:[0-9]+}")
    public Map<String, Object> comercioDetalle(@PathVariable Long tenantId, @RequestParam(defaultValue = "30") int dias) {
        AcumuladoVentas acc = new AcumuladoVentas();
        for (Map<String, Object> v : consultarFilas(
                "SELECT tenant_id, fecha_registro, total, utilidad, metodo_pago, detalle_json FROM ventas_mostrador WHERE tenant_id = ? AND fecha_registro >= ?",
                tenantId, Timestamp.valueOf(desde(dias)))) {
            acc.sumar(v, objectMapper);
        }
        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("topProductos", acc.topProductos(10));
        salida.put("tendencia", acc.tendencia());
        salida.put("metodosPago", acc.metodosPago());
        return salida;
    }

    /** Suma ventas del POS de Comercio; los productos salen del detalle JSON que guarda el POS. */
    private static class AcumuladoVentas {
        long ventas;
        BigDecimal monto = BigDecimal.ZERO;
        BigDecimal utilidad = BigDecimal.ZERO;
        Object ultima;
        final Map<String, double[]> productos = new HashMap<>(); // nombre -> [cantidad, monto]
        final Map<String, Set<Long>> comerciosPorProducto = new HashMap<>();
        final TreeMap<String, Object[]> porDia = new TreeMap<>(); // fecha -> [ventas, monto]
        final Map<String, Object[]> porMetodo = new TreeMap<>();

        void sumar(Map<String, Object> v, ObjectMapper mapper) {
            ventas++;
            BigDecimal total = dec(v.get("total"));
            monto = monto.add(total);
            utilidad = utilidad.add(dec(v.get("utilidad")));
            Object fecha = v.get("fecha_registro");
            if (ultima == null || (fecha != null && ((Timestamp) fecha).after((Timestamp) ultima))) ultima = fecha;
            if (fecha != null) {
                Object[] d = porDia.computeIfAbsent(((Timestamp) fecha).toLocalDateTime().toLocalDate().toString(), k -> new Object[]{0L, BigDecimal.ZERO});
                d[0] = (Long) d[0] + 1; d[1] = ((BigDecimal) d[1]).add(total);
            }
            String metodo = v.get("metodo_pago") == null ? "Sin especificar" : String.valueOf(v.get("metodo_pago"));
            Object[] m = porMetodo.computeIfAbsent(metodo, k -> new Object[]{0L, BigDecimal.ZERO});
            m[0] = (Long) m[0] + 1; m[1] = ((BigDecimal) m[1]).add(total);

            try {
                JsonNode lineas = mapper.readTree(String.valueOf(v.get("detalle_json"))).path("lineas");
                Long tenant = id(v.get("tenant_id"));
                for (JsonNode l : lineas) {
                    String nombre = l.path("nombre").asText("").trim();
                    if (nombre.isEmpty()) continue;
                    double cantidad = l.path("cantidad").asDouble(0);
                    double subtotal = cantidad * l.path("precio").asDouble(0) * (1 - l.path("descuentoPct").asDouble(0) / 100.0);
                    double[] p = productos.computeIfAbsent(nombre, k -> new double[2]);
                    p[0] += cantidad; p[1] += subtotal;
                    comerciosPorProducto.computeIfAbsent(nombre, k -> new HashSet<>()).add(tenant);
                }
            } catch (Exception ignorada) {
                // Detalle ilegible: la venta cuenta en los totales, sus productos no.
            }
        }

        List<Map<String, Object>> topProductos(int limite) {
            return productos.entrySet().stream()
                .sorted((a, b) -> Double.compare(b.getValue()[1], a.getValue()[1]))
                .limit(limite)
                .map(e -> {
                    Map<String, Object> p = new LinkedHashMap<>();
                    p.put("nombre", e.getKey());
                    p.put("cantidad", BigDecimal.valueOf(e.getValue()[0]).setScale(2, RoundingMode.HALF_UP));
                    p.put("monto", BigDecimal.valueOf(e.getValue()[1]).setScale(2, RoundingMode.HALF_UP));
                    p.put("comercios", comerciosPorProducto.getOrDefault(e.getKey(), Set.of()).size());
                    return p;
                })
                .toList();
        }

        List<Map<String, Object>> tendencia() {
            List<Map<String, Object>> salida = new ArrayList<>();
            porDia.forEach((dia, d) -> salida.add(Map.of("fecha", dia, "ventas", d[0], "monto", redondear((BigDecimal) d[1]))));
            return salida;
        }

        List<Map<String, Object>> metodosPago() {
            List<Map<String, Object>> salida = new ArrayList<>();
            porMetodo.forEach((metodo, d) -> salida.add(Map.of("metodo", metodo, "ventas", d[0], "monto", redondear((BigDecimal) d[1]))));
            salida.sort(Comparator.comparing((Map<String, Object> x) -> (BigDecimal) x.get("monto")).reversed());
            return salida;
        }
    }

    // ───────────────────── NEGOCIO: MRR, CHURN, SALUD ─────────────────────

    /**
     * MRR: cada pago confirmado en USD se reparte en partes iguales entre los
     * meses que cubre (un pago de 3 meses por $60 aporta $20 a cada mes). Un
     * cliente "pagando" en un mes es el que recibe aporte ese mes; churn es el
     * que pagaba el mes anterior y este ya no. El tiempo regalado (pagos de $0)
     * no cuenta como cliente pagando.
     */
    @GetMapping("/negocio")
    public Map<String, Object> negocio() {
        YearMonth mesActual = YearMonth.now();
        Map<YearMonth, Map<Long, BigDecimal>> aportes = new TreeMap<>();
        long pagosOtraMoneda = 0;
        for (Map<String, Object> p : consultarFilas(
                "SELECT tenant_id, monto, moneda, meses_pagados, dias_acreditados, fecha_pago FROM pagos_suscripcion_tenant "
                    + "WHERE (estado IS NULL OR estado = 'CONFIRMADO') AND monto > 0")) {
            if (p.get("fecha_pago") == null || p.get("tenant_id") == null) continue;
            if (!"USD".equalsIgnoreCase(String.valueOf(p.get("moneda")))) { pagosOtraMoneda++; continue; }
            int meses = p.get("meses_pagados") != null ? ((Number) p.get("meses_pagados")).intValue() : 0;
            if (meses <= 0 && p.get("dias_acreditados") != null) meses = (int) Math.round(((Number) p.get("dias_acreditados")).intValue() / 30.0);
            meses = Math.max(1, meses);
            BigDecimal porMes = dec(p.get("monto")).divide(BigDecimal.valueOf(meses), 4, RoundingMode.HALF_UP);
            YearMonth inicio = YearMonth.from(((Timestamp) p.get("fecha_pago")).toLocalDateTime());
            Long tenant = id(p.get("tenant_id"));
            for (int i = 0; i < meses; i++) {
                aportes.computeIfAbsent(inicio.plusMonths(i), k -> new HashMap<>()).merge(tenant, porMes, BigDecimal::add);
            }
        }

        List<Map<String, Object>> serie = new ArrayList<>();
        Set<Long> vistosAntes = new HashSet<>();
        aportes.forEach((mes, t) -> { if (mes.isBefore(mesActual.minusMonths(11))) vistosAntes.addAll(t.keySet()); });
        for (int i = 11; i >= 0; i--) {
            YearMonth mes = mesActual.minusMonths(i);
            Map<Long, BigDecimal> actual = aportes.getOrDefault(mes, Map.of());
            Map<Long, BigDecimal> previo = aportes.getOrDefault(mes.minusMonths(1), Map.of());
            long perdidos = previo.keySet().stream().filter(t -> !actual.containsKey(t)).count();
            long nuevos = actual.keySet().stream().filter(t -> !vistosAntes.contains(t)).count();
            vistosAntes.addAll(actual.keySet());
            Map<String, Object> punto = new LinkedHashMap<>();
            punto.put("mes", mes.toString());
            punto.put("mrr", redondear(actual.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add)));
            punto.put("clientesPagando", actual.size());
            punto.put("nuevos", nuevos);
            punto.put("perdidos", perdidos);
            punto.put("churnPct", previo.isEmpty() ? null : BigDecimal.valueOf(perdidos * 100.0 / previo.size()).setScale(1, RoundingMode.HALF_UP));
            serie.add(punto);
        }

        Map<Long, BigDecimal> esteMes = aportes.getOrDefault(mesActual, Map.of());
        BigDecimal mrr = esteMes.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, Object> resumen = new LinkedHashMap<>();
        resumen.put("mrr", redondear(mrr));
        resumen.put("arr", redondear(mrr.multiply(BigDecimal.valueOf(12))));
        resumen.put("clientesPagando", esteMes.size());
        resumen.put("arpu", esteMes.isEmpty() ? BigDecimal.ZERO : redondear(mrr.divide(BigDecimal.valueOf(esteMes.size()), 4, RoundingMode.HALF_UP)));
        resumen.put("pagosOtraMoneda", pagosOtraMoneda);

        List<Map<String, Object>> saludClientes = saludDeClientes(esteMes.keySet());
        Map<String, Long> semaforo = new LinkedHashMap<>(Map.of("VERDE", 0L, "AMARILLO", 0L, "ROJO", 0L));
        saludClientes.forEach(c -> semaforo.merge(String.valueOf(c.get("semaforo")), 1L, Long::sum));

        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("resumen", resumen);
        salida.put("serie", serie);
        salida.put("semaforo", semaforo);
        salida.put("clientes", saludClientes);
        return salida;
    }

    /** Semáforo por negocio: uso reciente, tendencia de uso, estado del pago y tickets abiertos. */
    private List<Map<String, Object>> saludDeClientes(Set<Long> pagandoEsteMes) {
        LocalDateTime ahora = LocalDateTime.now();
        Timestamp hace14 = Timestamp.valueOf(ahora.minusDays(14));
        Timestamp hace28 = Timestamp.valueOf(ahora.minusDays(28));
        Map<Long, LocalDateTime> ultima = new HashMap<>();
        Map<Long, long[]> uso = new HashMap<>(); // [últimos 14 días, 14 días previos]
        for (String[] fuente : FUENTES_ACTIVIDAD) {
            String tabla = fuente[0], col = fuente[1];
            for (Map<String, Object> r : consultarFilas(
                    "SELECT tenant_id, MAX(" + col + ") AS ultima, COUNT(*) FILTER (WHERE " + col + " >= ?) AS recientes, "
                        + "COUNT(*) FILTER (WHERE " + col + " >= ? AND " + col + " < ?) AS previos FROM " + tabla + " GROUP BY tenant_id",
                    hace14, hace28, hace14)) {
                if (r.get("tenant_id") == null) continue;
                Long t = id(r.get("tenant_id"));
                LocalDateTime u = aFecha(r.get("ultima"));
                if (u != null && (ultima.get(t) == null || u.isAfter(ultima.get(t)))) ultima.put(t, u);
                long[] c = uso.computeIfAbsent(t, k -> new long[2]);
                c[0] += num(r.get("recientes"));
                c[1] += num(r.get("previos"));
            }
        }
        Map<Long, long[]> tickets = new HashMap<>(); // [abiertos, urgentes]
        for (Map<String, Object> r : consultarFilas(
                "SELECT tenant_id, COUNT(*) AS n, COUNT(*) FILTER (WHERE prioridad IN ('ALTA','URGENTE','CRITICA')) AS urgentes "
                    + "FROM saas_soporte_tickets WHERE estado IN ('ABIERTO','EN_ATENCION') GROUP BY tenant_id")) {
            if (r.get("tenant_id") != null) tickets.put(id(r.get("tenant_id")), new long[]{num(r.get("n")), num(r.get("urgentes"))});
        }
        Set<Long> conPagos = new HashSet<>(consultar(
            "SELECT DISTINCT tenant_id FROM pagos_suscripcion_tenant WHERE tenant_id IS NOT NULL AND (estado IS NULL OR estado = 'CONFIRMADO') AND monto > 0", Long.class));

        LocalDate hoy = LocalDate.now();
        List<Map<String, Object>> salida = new ArrayList<>();
        for (Map<String, Object> lic : licencias()) {
            Long t = id(lic.get("tenant_id"));
            Map<String, Object> f = filaBase(lic);
            List<String> motivos = new ArrayList<>();
            int puntaje = 100;

            LocalDateTime u = ultima.get(t);
            Long diasSinUso = u == null ? null : ChronoUnit.DAYS.between(u.toLocalDate(), hoy);
            if (u == null) { puntaje -= 50; motivos.add("Nunca ha registrado actividad"); }
            else if (diasSinUso > 14) { puntaje -= 45; motivos.add("Sin uso hace " + diasSinUso + " días"); }
            else if (diasSinUso > 7) { puntaje -= 25; motivos.add("Sin uso hace " + diasSinUso + " días"); }

            long[] c = uso.getOrDefault(t, new long[2]);
            if (c[1] >= 10 && c[0] < c[1] / 2) {
                puntaje -= 20;
                motivos.add("El uso bajó " + Math.round(100 - c[0] * 100.0 / c[1]) + "% frente a las 2 semanas anteriores");
            }

            String estadoPago;
            Long diasParaVencer = null;
            LocalDate vence = lic.get("fecha_vencimiento_pago") == null ? null : ((java.sql.Date) lic.get("fecha_vencimiento_pago")).toLocalDate();
            if (!conPagos.contains(t)) estadoPago = "SIN_PAGOS";
            else if (vence == null) estadoPago = "AL_DIA";
            else {
                diasParaVencer = ChronoUnit.DAYS.between(hoy, vence);
                estadoPago = diasParaVencer < 0 ? "VENCIDO" : diasParaVencer <= 5 ? "POR_VENCER" : "AL_DIA";
            }
            if ("VENCIDO".equals(estadoPago)) { puntaje -= 35; motivos.add("Pago vencido hace " + (-diasParaVencer) + " días"); }
            if ("POR_VENCER".equals(estadoPago)) { puntaje -= 10; motivos.add("El pago vence en " + diasParaVencer + " días"); }

            long[] tk = tickets.getOrDefault(t, new long[2]);
            if (tk[0] >= 2) { puntaje -= 10; motivos.add(tk[0] + " tickets de soporte abiertos"); }
            if (tk[1] > 0) { puntaje -= 10; motivos.add("Tiene tickets urgentes sin resolver"); }

            if (Boolean.FALSE.equals(lic.get("activa"))) { puntaje = Math.min(puntaje, 20); motivos.add("Cuenta suspendida"); }
            puntaje = Math.max(0, puntaje);

            f.put("puntaje", puntaje);
            f.put("semaforo", puntaje >= 70 ? "VERDE" : puntaje >= 40 ? "AMARILLO" : "ROJO");
            f.put("motivos", motivos);
            f.put("ultimaActividad", u);
            f.put("diasSinActividad", diasSinUso);
            f.put("usoUltimos14", c[0]);
            f.put("usoPrevios14", c[1]);
            f.put("estadoPago", estadoPago);
            f.put("diasParaVencer", diasParaVencer);
            f.put("pagandoEsteMes", pagandoEsteMes.contains(t));
            f.put("ticketsAbiertos", tk[0]);
            salida.add(f);
        }
        salida.sort(Comparator.comparingInt(f -> (Integer) f.get("puntaje")));
        return salida;
    }

    // ───────────────────────────── utilidades ─────────────────────────────

    private List<Map<String, Object>> licencias() {
        return consultarFilas("SELECT tenant_id, nombre_empresa, modulo_principal, tipo_licencia, activa, fecha_alta, fecha_vencimiento_pago "
            + "FROM licencias_tenant WHERE tenant_id IS NOT NULL ORDER BY tenant_id");
    }

    private Map<Long, Map<String, Object>> licenciasPorId() {
        Map<Long, Map<String, Object>> m = new HashMap<>();
        licencias().forEach(l -> m.put(id(l.get("tenant_id")), l));
        return m;
    }

    private static Map<String, Object> filaBase(Map<String, Object> lic) {
        Map<String, Object> f = new LinkedHashMap<>();
        f.put("tenantId", id(lic.get("tenant_id")));
        f.put("nombreEmpresa", lic.get("nombre_empresa"));
        f.put("moduloPrincipal", lic.get("modulo_principal"));
        f.put("plan", lic.get("tipo_licencia"));
        f.put("activa", lic.get("activa"));
        f.put("fechaAlta", lic.get("fecha_alta"));
        return f;
    }

    /** Una tabla que falte en alguna instalación no debe tumbar todo el tablero. */
    private List<Map<String, Object>> consultarFilas(String sql, Object... params) {
        try {
            return jdbc.queryForList(sql, params);
        } catch (DataAccessException e) {
            return List.of();
        }
    }

    private <T> List<T> consultar(String sql, Class<T> tipo) {
        try {
            return jdbc.queryForList(sql, tipo);
        } catch (DataAccessException e) {
            return List.of();
        }
    }

    private static LocalDateTime desde(int dias) {
        return LocalDate.now().minusDays(Math.max(1, Math.min(dias, 3650)) - 1L).atStartOfDay();
    }

    private static LocalDateTime aFecha(Object o) {
        if (o instanceof Timestamp ts) return ts.toLocalDateTime();
        if (o instanceof java.sql.Date d) return d.toLocalDate().atStartOfDay();
        return null;
    }

    private static Long id(Object o) { return ((Number) o).longValue(); }

    private static long num(Object o) { return o == null ? 0L : ((Number) o).longValue(); }

    private static BigDecimal dec(Object o) {
        if (o == null) return BigDecimal.ZERO;
        return o instanceof BigDecimal b ? b : new BigDecimal(o.toString());
    }

    private static BigDecimal redondear(BigDecimal b) { return b.setScale(2, RoundingMode.HALF_UP); }
}
