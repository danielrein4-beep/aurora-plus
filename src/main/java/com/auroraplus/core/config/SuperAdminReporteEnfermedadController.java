package com.auroraplus.core.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.*;

/**
 * Reporte epidemiológico de UNA enfermedad (CIE-10) en toda la red: casos por
 * médico y por mes, año consultado contra el anterior. Solo lectura, al lado
 * del Canal Endémico sin tocarlo: suma lo mismo que él (consultas con ese
 * diagnóstico principal + casos históricos importados) para que los números
 * cuadren con el canal que se ve debajo en la pantalla y en el PDF.
 *
 * En Mediclinic cada médico es su propio tenant (MedicoTenantResolver), así
 * que "médico" aquí es el tenant de salud.
 *
 * Protegido por TenantInterceptor / PermisosSuperAdmin (lectura bajo /actividad).
 */
@RestController
@RequestMapping("/api/super-admin/actividad/enfermedad")
public class SuperAdminReporteEnfermedadController {

    @Autowired
    private JdbcTemplate jdbc;

    @GetMapping
    public Map<String, Object> reporte(@RequestParam String cie10, @RequestParam(required = false) Integer anio) {
        String codigo = cie10 == null ? "" : cie10.trim().toUpperCase();
        if (!codigo.matches("[A-Z][0-9A-Z.]{1,9}")) throw new RuntimeException("Código CIE-10 no válido");
        int anioConsultado = anio != null ? anio : LocalDate.now().getYear();
        int anioAnterior = anioConsultado - 1;

        Map<Long, Map<String, Object>> medicos = new LinkedHashMap<>();
        long[] redMes = new long[12];
        long[] redMesAnterior = new long[12];

        // Consultas registradas en el sistema.
        for (Map<String, Object> r : jdbc.queryForList(
                "SELECT tenant_id, CAST(EXTRACT(YEAR FROM fecha_hora) AS INT) AS y, CAST(EXTRACT(MONTH FROM fecha_hora) AS INT) AS m, COUNT(*) AS n "
                    + "FROM salud_consultas WHERE diagnostico_principal_cie10 = ? GROUP BY tenant_id, y, m", codigo)) {
            sumar(medicos, redMes, redMesAnterior, r, anioConsultado, anioAnterior);
        }
        // Casos históricos importados desde Excel (por mes, o por semana ISO convertida a mes).
        for (Map<String, Object> r : jdbc.queryForList(
                "SELECT tenant_id, anio AS y, COALESCE(mes, LEAST(12, GREATEST(1, CAST(CEIL(COALESCE(semana, 1) * 12.0 / 53) AS INT)))) AS m, SUM(casos) AS n "
                    + "FROM salud_casos_historicos_importados WHERE diagnostico_cie10 = ? GROUP BY tenant_id, y, m", codigo)) {
            sumar(medicos, redMes, redMesAnterior, r, anioConsultado, anioAnterior);
        }

        // Pacientes distintos y último caso (solo consultas: los importados no traen paciente ni fecha exacta).
        long pacientesRed = 0;
        for (Map<String, Object> r : jdbc.queryForList(
                "SELECT tenant_id, COUNT(DISTINCT paciente_id) AS pacientes, MAX(fecha_hora) AS ultimo FROM salud_consultas "
                    + "WHERE diagnostico_principal_cie10 = ? AND EXTRACT(YEAR FROM fecha_hora) = ? GROUP BY tenant_id", codigo, anioConsultado)) {
            Map<String, Object> m = medico(medicos, ((Number) r.get("tenant_id")).longValue());
            long pacientes = ((Number) r.get("pacientes")).longValue();
            m.put("pacientesDistintos", pacientes);
            pacientesRed += pacientes;
            Object ultimo = r.get("ultimo");
            if (ultimo instanceof Timestamp ts) m.put("ultimoCaso", ts.toLocalDateTime().toString());
        }

        completarNombres(medicos);

        List<Map<String, Object>> lista = new ArrayList<>(medicos.values());
        long totalAnio = Arrays.stream(redMes).sum();
        for (Map<String, Object> m : lista) {
            long casos = (long) m.get("casosAnio");
            m.put("participacionPct", totalAnio == 0 ? 0 : Math.round(casos * 1000.0 / totalAnio) / 10.0);
        }
        lista.sort(Comparator.<Map<String, Object>>comparingLong(m -> (long) m.get("casosAnio"))
            .thenComparingLong(m -> (long) m.get("casosHistorico")).reversed());

        String descripcion = jdbc.query(
            "SELECT descripcion_diagnostico FROM salud_consultas WHERE diagnostico_principal_cie10 = ? AND descripcion_diagnostico IS NOT NULL "
                + "GROUP BY descripcion_diagnostico ORDER BY COUNT(*) DESC LIMIT 1",
            rs -> rs.next() ? rs.getString(1) : null, codigo);

        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("cie10", codigo);
        salida.put("descripcion", descripcion);
        salida.put("anio", anioConsultado);
        salida.put("totalAnio", totalAnio);
        salida.put("totalAnioAnterior", Arrays.stream(redMesAnterior).sum());
        salida.put("totalHistorico", lista.stream().mapToLong(m -> (long) m.get("casosHistorico")).sum());
        salida.put("pacientesDistintos", pacientesRed);
        salida.put("medicosConCasos", lista.stream().filter(m -> (long) m.get("casosAnio") > 0).count());
        salida.put("porMes", redMes);
        salida.put("porMesAnterior", redMesAnterior);
        salida.put("medicos", lista);
        return salida;
    }

    private static void sumar(Map<Long, Map<String, Object>> medicos, long[] redMes, long[] redMesAnterior,
                              Map<String, Object> r, int anio, int anioAnterior) {
        Map<String, Object> m = medico(medicos, ((Number) r.get("tenant_id")).longValue());
        int y = ((Number) r.get("y")).intValue();
        int mes = ((Number) r.get("m")).intValue();
        long n = ((Number) r.get("n")).longValue();
        m.put("casosHistorico", (long) m.get("casosHistorico") + n);
        if (mes < 1 || mes > 12) return;
        if (y == anio) {
            m.put("casosAnio", (long) m.get("casosAnio") + n);
            ((long[]) m.get("porMes"))[mes - 1] += n;
            redMes[mes - 1] += n;
        } else if (y == anioAnterior) {
            m.put("casosAnioAnterior", (long) m.get("casosAnioAnterior") + n);
            redMesAnterior[mes - 1] += n;
        }
    }

    private static Map<String, Object> medico(Map<Long, Map<String, Object>> medicos, long tenantId) {
        return medicos.computeIfAbsent(tenantId, id -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("tenantId", id);
            m.put("medico", null);
            m.put("especialidad", null);
            m.put("clinica", null);
            m.put("casosAnio", 0L);
            m.put("casosAnioAnterior", 0L);
            m.put("casosHistorico", 0L);
            m.put("pacientesDistintos", 0L);
            m.put("ultimoCaso", null);
            m.put("porMes", new long[12]);
            return m;
        });
    }

    /** Nombre del médico: su configuración médica; si no la llenó, el nombre más usado en sus consultas. */
    private void completarNombres(Map<Long, Map<String, Object>> medicos) {
        if (medicos.isEmpty()) return;
        String ids = String.join(",", Collections.nCopies(medicos.size(), "?"));
        Object[] params = medicos.keySet().toArray();
        for (Map<String, Object> r : jdbc.queryForList("SELECT tenant_id, nombre_empresa FROM licencias_tenant WHERE tenant_id IN (" + ids + ")", params)) {
            medicos.get(((Number) r.get("tenant_id")).longValue()).put("clinica", r.get("nombre_empresa"));
        }
        for (Map<String, Object> r : jdbc.queryForList(
                "SELECT tenant_id, doctor_nombre, especialidad FROM salud_configuracion_medica WHERE tenant_id IN (" + ids + ")", params)) {
            Map<String, Object> m = medicos.get(((Number) r.get("tenant_id")).longValue());
            if (r.get("doctor_nombre") != null && !r.get("doctor_nombre").toString().isBlank()) m.put("medico", r.get("doctor_nombre"));
            m.put("especialidad", r.get("especialidad"));
        }
        for (Map<String, Object> r : jdbc.queryForList(
                "SELECT DISTINCT ON (tenant_id) tenant_id, medico_nombre FROM salud_consultas "
                    + "WHERE tenant_id IN (" + ids + ") AND medico_nombre IS NOT NULL AND medico_nombre <> '' "
                    + "GROUP BY tenant_id, medico_nombre ORDER BY tenant_id, COUNT(*) DESC", params)) {
            Map<String, Object> m = medicos.get(((Number) r.get("tenant_id")).longValue());
            if (m.get("medico") == null) m.put("medico", r.get("medico_nombre"));
        }
        medicos.values().forEach(m -> {
            if (m.get("medico") == null) m.put("medico", m.get("clinica") != null ? m.get("clinica") : "Médico #" + m.get("tenantId"));
        });
    }
}
