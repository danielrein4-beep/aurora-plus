package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.services.OdontologiaInsumosService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.*;

/**
 * Gestion de la clinica dental (no de un paciente puntual): tablero del dia,
 * recall de pacientes sin control, cuotas de planes y kits de insumos.
 */
@RestController
@RequestMapping("/api/salud/odontologia")
public class OdontologiaGestionController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private OdontologiaInsumosService odontologiaInsumosService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private void exigirAdministracion() {
        String rol = AuthContext.getRol();
        // Sin rol no hay acceso: toda sesion valida de Aurora lo trae en el token.
        if (rol == null || !"DUENO_ADMIN".equalsIgnoreCase(rol) && !"MEDICO".equalsIgnoreCase(rol) && !"SUPER_ADMIN".equalsIgnoreCase(rol)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acceso denegado: solo odontologos y administracion.");
        }
    }

    // ==========================================
    // CUOTAS DE PLANES
    // ==========================================

    public static class CrearCuotasRequest {
        public Integer numeroCuotas;
        public String fechaPrimera;
        public Integer diasEntreCuotas;
    }

    /**
     * Estado de las cuotas: lo abonado despues de financiar se aplica a las
     * cuotas en orden, de la primera a la ultima.
     */
    private List<Map<String, Object>> estadoCuotas(Long tenantId, Long planId) {
        List<Map<String, Object>> plan = jdbcTemplate.queryForList(
            "SELECT monto_pagado_usd, COALESCE(pagado_al_financiar_usd, 0) AS base FROM salud_odontologia_planes_tratamiento WHERE tenant_id = ? AND id = ?",
            tenantId, planId);
        if (plan.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan no encontrado.");
        }
        BigDecimal disponible = ((BigDecimal) plan.get(0).get("monto_pagado_usd")).subtract((BigDecimal) plan.get(0).get("base"));
        if (disponible.signum() < 0) disponible = BigDecimal.ZERO;

        List<Map<String, Object>> cuotas = jdbcTemplate.queryForList(
            "SELECT id, numero, fecha_vencimiento, monto_usd FROM salud_odontologia_plan_cuotas WHERE tenant_id = ? AND plan_id = ? ORDER BY numero",
            tenantId, planId);
        LocalDate hoy = LocalDate.now();
        for (Map<String, Object> c : cuotas) {
            BigDecimal monto = (BigDecimal) c.get("monto_usd");
            BigDecimal aplicado = disponible.min(monto);
            disponible = disponible.subtract(aplicado);
            LocalDate vence = ((java.sql.Date) c.get("fecha_vencimiento")).toLocalDate();
            String estado;
            if (aplicado.compareTo(monto) >= 0) estado = "PAGADA";
            else if (vence.isBefore(hoy)) estado = "VENCIDA";
            else if (aplicado.signum() > 0) estado = "PARCIAL";
            else estado = "PENDIENTE";
            c.put("pagado_usd", aplicado);
            c.put("pendiente_usd", monto.subtract(aplicado));
            c.put("estado", estado);
        }
        return cuotas;
    }

    @GetMapping("/planes/{planId}/cuotas")
    public List<Map<String, Object>> listarCuotas(@PathVariable Long planId) {
        exigirAdministracion();
        return estadoCuotas(TenantContext.getCurrentTenant(), planId);
    }

    /** Reparte el saldo pendiente del plan en cuotas iguales (la ultima absorbe el redondeo). */
    @PostMapping("/planes/{planId}/cuotas")
    @Transactional
    public List<Map<String, Object>> crearCuotas(@PathVariable Long planId, @RequestBody CrearCuotasRequest req) {
        exigirAdministracion();
        Long tenantId = TenantContext.getCurrentTenant();
        int n = req.numeroCuotas != null ? req.numeroCuotas : 0;
        if (n < 2 || n > 60) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El numero de cuotas debe estar entre 2 y 60.");
        }
        int dias = req.diasEntreCuotas != null ? req.diasEntreCuotas : 30;
        if (dias < 7 || dias > 90) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Los dias entre cuotas deben estar entre 7 y 90.");
        }
        LocalDate primera;
        try {
            primera = req.fechaPrimera != null ? LocalDate.parse(req.fechaPrimera) : LocalDate.now().plusDays(dias);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fecha de la primera cuota invalida.");
        }

        List<Map<String, Object>> plan = jdbcTemplate.queryForList(
            "SELECT estado, monto_total_usd, monto_pagado_usd FROM salud_odontologia_planes_tratamiento WHERE tenant_id = ? AND id = ? FOR UPDATE",
            tenantId, planId);
        if (plan.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan no encontrado.");
        }
        if ("CANCELADO".equals(plan.get(0).get("estado"))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No se puede financiar un plan cancelado.");
        }
        BigDecimal pagado = (BigDecimal) plan.get(0).get("monto_pagado_usd");
        BigDecimal saldo = ((BigDecimal) plan.get(0).get("monto_total_usd")).subtract(pagado);
        if (saldo.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El plan no tiene saldo pendiente para financiar.");
        }

        jdbcTemplate.update("DELETE FROM salud_odontologia_plan_cuotas WHERE tenant_id = ? AND plan_id = ?", tenantId, planId);
        jdbcTemplate.update("UPDATE salud_odontologia_planes_tratamiento SET pagado_al_financiar_usd = ? WHERE tenant_id = ? AND id = ?",
            pagado, tenantId, planId);

        BigDecimal cuota = saldo.divide(BigDecimal.valueOf(n), 2, RoundingMode.DOWN);
        BigDecimal acumulado = BigDecimal.ZERO;
        for (int i = 1; i <= n; i++) {
            BigDecimal monto = i < n ? cuota : saldo.subtract(acumulado);
            acumulado = acumulado.add(monto);
            jdbcTemplate.update(
                "INSERT INTO salud_odontologia_plan_cuotas (tenant_id, plan_id, numero, fecha_vencimiento, monto_usd) VALUES (?, ?, ?, ?, ?)",
                tenantId, planId, i, java.sql.Date.valueOf(primera.plusDays((long) dias * (i - 1))), monto);
        }
        return estadoCuotas(tenantId, planId);
    }

    @DeleteMapping("/planes/{planId}/cuotas")
    @Transactional
    public ResponseEntity<?> eliminarCuotas(@PathVariable Long planId) {
        exigirAdministracion();
        Long tenantId = TenantContext.getCurrentTenant();
        jdbcTemplate.update("DELETE FROM salud_odontologia_plan_cuotas WHERE tenant_id = ? AND plan_id = ?", tenantId, planId);
        jdbcTemplate.update("UPDATE salud_odontologia_planes_tratamiento SET pagado_al_financiar_usd = NULL WHERE tenant_id = ? AND id = ?",
            tenantId, planId);
        return ResponseEntity.ok(Map.of("mensaje", "Cuotas eliminadas; el plan vuelve a pago libre."));
    }

    /** Cuotas vencidas de toda la clinica, con datos de contacto para cobrarlas. */
    private List<Map<String, Object>> cuotasVencidas(Long tenantId) {
        List<Map<String, Object>> planes = jdbcTemplate.queryForList(
            "SELECT DISTINCT pt.id, pt.nombre_plan, p.id AS paciente_id, (p.nombres || ' ' || p.apellidos) AS paciente, p.telefono " +
            "FROM salud_odontologia_planes_tratamiento pt " +
            "JOIN salud_odontologia_plan_cuotas c ON c.plan_id = pt.id " +
            "JOIN salud_pacientes p ON p.id = pt.paciente_id " +
            "WHERE pt.tenant_id = ? AND pt.estado <> 'CANCELADO' AND c.fecha_vencimiento < CURRENT_DATE",
            tenantId);
        List<Map<String, Object>> resultado = new ArrayList<>();
        for (Map<String, Object> plan : planes) {
            Long planId = ((Number) plan.get("id")).longValue();
            BigDecimal vencido = BigDecimal.ZERO;
            int cuotas = 0;
            Object primeraVencida = null;
            for (Map<String, Object> c : estadoCuotas(tenantId, planId)) {
                if ("VENCIDA".equals(c.get("estado"))) {
                    vencido = vencido.add((BigDecimal) c.get("pendiente_usd"));
                    cuotas++;
                    if (primeraVencida == null) primeraVencida = c.get("fecha_vencimiento");
                }
            }
            if (cuotas > 0) {
                Map<String, Object> fila = new LinkedHashMap<>(plan);
                fila.put("cuotas_vencidas", cuotas);
                fila.put("monto_vencido_usd", vencido);
                fila.put("vencida_desde", primeraVencida);
                resultado.add(fila);
            }
        }
        resultado.sort(Comparator.comparing(f -> String.valueOf(f.get("vencida_desde"))));
        return resultado;
    }

    @GetMapping("/cuotas/vencidas")
    public List<Map<String, Object>> listarCuotasVencidas() {
        exigirAdministracion();
        return cuotasVencidas(TenantContext.getCurrentTenant());
    }

    // ==========================================
    // RECALL
    // ==========================================

    /**
     * Pacientes con actividad dental cuya ultima visita fue hace mas de N meses
     * y que no tienen una cita futura agendada.
     */
    private List<Map<String, Object>> recall(Long tenantId, int meses) {
        return jdbcTemplate.queryForList(
            "WITH visitas AS (" +
            "  SELECT paciente_id, fecha_cita AS fecha FROM salud_odontologia_citas_agenda WHERE tenant_id = ? AND estado = 'COMPLETADA' " +
            "  UNION ALL SELECT paciente_id, fecha_sesion FROM salud_odontologia_evolucion_sesiones WHERE tenant_id = ? " +
            "  UNION ALL SELECT pt.paciente_id, CAST(i.fecha_realizado AS date) FROM salud_odontologia_plan_items i " +
            "    JOIN salud_odontologia_planes_tratamiento pt ON pt.id = i.plan_id " +
            "    WHERE i.tenant_id = ? AND i.fecha_realizado IS NOT NULL" +
            "), ultima AS (SELECT paciente_id, MAX(fecha) AS ultima_visita FROM visitas GROUP BY paciente_id) " +
            "SELECT p.id AS paciente_id, (p.nombres || ' ' || p.apellidos) AS paciente, p.telefono, p.email, u.ultima_visita, " +
            "  (EXTRACT(YEAR FROM age(CURRENT_DATE, u.ultima_visita)) * 12 + EXTRACT(MONTH FROM age(CURRENT_DATE, u.ultima_visita)))::int AS meses_sin_visita " +
            "FROM ultima u JOIN salud_pacientes p ON p.id = u.paciente_id AND p.tenant_id = ? " +
            "WHERE u.ultima_visita < CURRENT_DATE - make_interval(months => ?) " +
            "AND NOT EXISTS (SELECT 1 FROM salud_odontologia_citas_agenda f WHERE f.tenant_id = ? AND f.paciente_id = p.id " +
            "  AND f.fecha_cita >= CURRENT_DATE AND f.estado IN ('PROGRAMADA', 'CONFIRMADA')) " +
            "ORDER BY u.ultima_visita ASC LIMIT 200",
            tenantId, tenantId, tenantId, tenantId, meses, tenantId);
    }

    @GetMapping("/recall")
    public List<Map<String, Object>> listarRecall(@RequestParam(defaultValue = "6") int meses) {
        exigirAdministracion();
        if (meses < 1 || meses > 36) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Los meses deben estar entre 1 y 36.");
        }
        return recall(TenantContext.getCurrentTenant(), meses);
    }

    // ==========================================
    // TABLERO DEL DIA
    // ==========================================

    @GetMapping("/tablero")
    public Map<String, Object> tablero() {
        exigirAdministracion();
        Long tenantId = TenantContext.getCurrentTenant();
        Map<String, Object> t = new LinkedHashMap<>();

        t.put("citasHoy", jdbcTemplate.queryForList(
            "SELECT c.id, c.hora_inicio, c.hora_fin, c.sillon_box, c.odontologo, c.motivo, c.estado, " +
            "(p.nombres || ' ' || p.apellidos) AS paciente, p.telefono " +
            "FROM salud_odontologia_citas_agenda c JOIN salud_pacientes p ON p.id = c.paciente_id " +
            "WHERE c.tenant_id = ? AND c.fecha_cita = CURRENT_DATE ORDER BY c.hora_inicio",
            tenantId));

        t.put("cobradoHoyUsd", jdbcTemplate.queryForObject(
            "SELECT COALESCE(SUM(monto_usd), 0) FROM salud_odontologia_plan_abonos WHERE tenant_id = ? AND CAST(fecha_registro AS date) = CURRENT_DATE",
            BigDecimal.class, tenantId));

        t.put("porCobrarUsd", jdbcTemplate.queryForObject(
            "SELECT COALESCE(SUM(monto_total_usd - monto_pagado_usd), 0) FROM salud_odontologia_planes_tratamiento " +
            "WHERE tenant_id = ? AND estado <> 'CANCELADO' AND monto_total_usd > monto_pagado_usd",
            BigDecimal.class, tenantId));

        // Presupuestos entregados que el paciente aun no acepta: dinero sobre la mesa.
        t.put("presupuestosPorAprobar", jdbcTemplate.queryForMap(
            "SELECT count(*) AS cantidad, COALESCE(SUM(monto_total_usd), 0) AS monto_usd " +
            "FROM salud_odontologia_planes_tratamiento WHERE tenant_id = ? AND estado = 'PROPUESTO'",
            tenantId));

        List<Map<String, Object>> vencidas = cuotasVencidas(tenantId);
        t.put("cuotasVencidas", vencidas);

        t.put("recallCantidad", recall(tenantId, 6).size());

        t.put("insumosBajoMinimo", jdbcTemplate.queryForList(
            "SELECT id, nombre, stock_actual, stock_minimo, unidad_medida FROM articulos " +
            "WHERE tenant_id = ? AND stock_minimo IS NOT NULL AND stock_actual < stock_minimo ORDER BY nombre LIMIT 50",
            tenantId));

        return t;
    }

    // ==========================================
    // KITS DE INSUMOS
    // ==========================================

    public static class GuardarKitRequest {
        public String nombreKit;
        public String palabrasClave;
        public List<OdontologiaInsumosService.InsumoKit> insumos;
    }

    private String insumosComoJson(List<OdontologiaInsumosService.InsumoKit> insumos) {
        List<OdontologiaInsumosService.InsumoKit> validos = insumos == null ? List.of() : insumos.stream()
            .filter(i -> i != null && i.nombre != null && !i.nombre.isBlank()
                && i.cantidad != null && i.cantidad.signum() > 0)
            .toList();
        try {
            return objectMapper.writeValueAsString(validos);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insumos con formato invalido.");
        }
    }

    private void validarKit(GuardarKitRequest req) {
        if (req.nombreKit == null || req.nombreKit.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre del kit es requerido.");
        }
        if (req.palabrasClave == null || req.palabrasClave.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Indica al menos una palabra clave del procedimiento (ej: resina, endodoncia).");
        }
    }

    @PostMapping("/kits")
    @Transactional
    public ResponseEntity<?> crearKit(@RequestBody GuardarKitRequest req) {
        exigirAdministracion();
        validarKit(req);
        Long tenantId = TenantContext.getCurrentTenant();
        String clave = "KIT_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Long id = jdbcTemplate.queryForObject(
            "INSERT INTO salud_odontologia_kits_procedimientos (tenant_id, procedimiento_clave, nombre_kit, insumos_json, palabras_clave) " +
            "VALUES (?, ?, ?, CAST(? AS jsonb), ?) RETURNING id",
            Long.class, tenantId, clave, req.nombreKit.trim(), insumosComoJson(req.insumos), req.palabrasClave.trim().toLowerCase());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", id));
    }

    @PutMapping("/kits/{id}")
    @Transactional
    public ResponseEntity<?> actualizarKit(@PathVariable Long id, @RequestBody GuardarKitRequest req) {
        exigirAdministracion();
        validarKit(req);
        Long tenantId = TenantContext.getCurrentTenant();
        int filas = jdbcTemplate.update(
            "UPDATE salud_odontologia_kits_procedimientos SET nombre_kit = ?, insumos_json = CAST(? AS jsonb), palabras_clave = ? " +
            "WHERE tenant_id = ? AND id = ?",
            req.nombreKit.trim(), insumosComoJson(req.insumos), req.palabrasClave.trim().toLowerCase(), tenantId, id);
        if (filas == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Kit no encontrado.");
        }
        return ResponseEntity.ok(Map.of("id", id));
    }

    @DeleteMapping("/kits/{id}")
    @Transactional
    public ResponseEntity<?> desactivarKit(@PathVariable Long id) {
        exigirAdministracion();
        Long tenantId = TenantContext.getCurrentTenant();
        int filas = jdbcTemplate.update(
            "UPDATE salud_odontologia_kits_procedimientos SET activo = false WHERE tenant_id = ? AND id = ?", tenantId, id);
        if (filas == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Kit no encontrado.");
        }
        return ResponseEntity.ok(Map.of("mensaje", "Kit desactivado."));
    }

    /** Que kit se usaria para un procedimiento dado (para probar las palabras clave). */
    @GetMapping("/kits/sugerido")
    public Map<String, Object> kitSugerido(@RequestParam String procedimiento) {
        exigirAdministracion();
        Map<String, Object> kit = odontologiaInsumosService.buscarKit(TenantContext.getCurrentTenant(), procedimiento);
        return kit != null ? kit : Map.of();
    }
}
