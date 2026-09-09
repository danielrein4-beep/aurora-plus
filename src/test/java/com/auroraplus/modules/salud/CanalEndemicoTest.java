package com.auroraplus.modules.salud;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Canal Endémico: valida el motor de vigilancia epidemiológica construido a
 * partir de los diagnósticos CIE-10 que los médicos ya registran en consulta.
 *
 * Dos ángulos que importan de verdad:
 * 1) Aislamiento — el canal de UN médico nunca debe incluir casos de otra
 *    clínica (mismo riesgo de fuga de datos que ya probamos en el resto del
 *    módulo, ahora aplicado a esta funcionalidad nueva).
 * 2) La vista consolidada del super-admin SÍ debe agregar TODAS las clínicas
 *    — es la base del reporte epidemiológico de red, el punto de la función.
 */
class CanalEndemicoTest extends SaludIntegrationTestBase {

    private long registrarConsultaConFechaYCie10(Sesion sesion, long pacienteId, String fechaHoraIso, String cie10) {
        Map<String, Object> consulta = new LinkedHashMap<>();
        consulta.put("paciente", Map.of("id", pacienteId));
        consulta.put("fechaHora", fechaHoraIso);
        consulta.put("motivoConsulta", "Fiebre y dolor articular");
        consulta.put("diagnosticoPrincipalCIE10", cie10);
        consulta.put("descripcionDiagnostico", "Caso de vigilancia");

        ResponseEntity<JsonNode> resp = post(sesion, "/api/salud/consultas", consulta);
        assertEquals(HttpStatus.OK, resp.getStatusCode(), "Registrar consulta debe responder 200: " + resp.getBody());
        return resp.getBody().get("id").asLong();
    }

    private Sesion loginSuperAdmin() {
        Map<String, Object> body = Map.of("username", "test-admin", "password", "test-admin-123");
        ResponseEntity<JsonNode> resp = rest.postForEntity(url("/api/auth/login-super-admin"), body, JsonNode.class);
        assertEquals(HttpStatus.OK, resp.getStatusCode(), "Login de super-admin debe responder 200: " + resp.getBody());
        return new Sesion(resp.getBody().get("token").asText(), -1L);
    }

    @Test
    void laBandaAnualEsUnaReferenciaEstadisticaNoUnCorredorPorPeriodo() {
        Sesion clinica = registrarClinica("Clinica Canal Anual " + UUID.randomUUID());
        String cie10 = "B54"; // paludismo

        // 3 años históricos con totales conocidos: 2, 4 y 6 casos — mediana = 4, p25 = 3, p75 = 5.
        registrarConsultaConFechaYCie10(clinica, registrarPaciente(clinica, "V-90000001", "P", "1"), "2023-06-01T09:00:00", cie10);
        registrarConsultaConFechaYCie10(clinica, registrarPaciente(clinica, "V-90000002", "P", "2"), "2023-06-02T09:00:00", cie10);

        registrarConsultaConFechaYCie10(clinica, registrarPaciente(clinica, "V-90000003", "P", "3"), "2024-06-01T09:00:00", cie10);
        registrarConsultaConFechaYCie10(clinica, registrarPaciente(clinica, "V-90000004", "P", "4"), "2024-06-02T09:00:00", cie10);
        registrarConsultaConFechaYCie10(clinica, registrarPaciente(clinica, "V-90000005", "P", "5"), "2024-06-03T09:00:00", cie10);
        registrarConsultaConFechaYCie10(clinica, registrarPaciente(clinica, "V-90000006", "P", "6"), "2024-06-04T09:00:00", cie10);

        registrarConsultaConFechaYCie10(clinica, registrarPaciente(clinica, "V-90000007", "P", "7"), "2025-06-01T09:00:00", cie10);
        registrarConsultaConFechaYCie10(clinica, registrarPaciente(clinica, "V-90000008", "P", "8"), "2025-06-02T09:00:00", cie10);
        registrarConsultaConFechaYCie10(clinica, registrarPaciente(clinica, "V-90000009", "P", "9"), "2025-06-03T09:00:00", cie10);
        registrarConsultaConFechaYCie10(clinica, registrarPaciente(clinica, "V-9000000A", "P", "10"), "2025-06-04T09:00:00", cie10);
        registrarConsultaConFechaYCie10(clinica, registrarPaciente(clinica, "V-9000000B", "P", "11"), "2025-06-05T09:00:00", cie10);
        registrarConsultaConFechaYCie10(clinica, registrarPaciente(clinica, "V-9000000C", "P", "12"), "2025-06-06T09:00:00", cie10);

        // Se consulta el año 2026 (sin casos propios) — la banda debe salir de 2023/2024/2025 únicamente.
        ResponseEntity<JsonNode> canal = get(clinica, "/api/salud/canal-endemico?cie10=" + cie10 + "&anio=2026");
        assertEquals(HttpStatus.OK, canal.getStatusCode());

        JsonNode banda = canal.getBody().get("bandaReferenciaAnual");
        assertEquals(3, banda.get("aniosUsados").asInt(), "Debe usar los 3 años históricos (2023, 2024, 2025)");
        assertEquals(2.0, banda.get("minimo").asDouble(), 0.001);
        assertEquals(6.0, banda.get("maximo").asDouble(), 0.001);
        assertEquals(4.0, banda.get("mediana").asDouble(), 0.001, "La mediana de 2,4,6 debe ser 4");
    }

    /** Registra N consultas del mismo diagnóstico, todas en la misma fecha, para simular un total anual conocido sin escribir un alta por caso. */
    private void registrarNCasos(Sesion sesion, String cie10, String anio, int cantidad, String prefijoCedula) {
        for (int i = 0; i < cantidad; i++) {
            long pid = registrarPaciente(sesion, prefijoCedula + String.format("%04d", i), "P", "C" + i);
            registrarConsultaConFechaYCie10(sesion, pid, anio + "-06-01T09:00:00", cie10);
        }
    }

    @Test
    void unAnioConBroteEpidemicoNoContaminaLaBandaDeReferencia() {
        Sesion clinica = registrarClinica("Clinica Depuracion " + UUID.randomUUID());
        String cie10 = "A90";

        // 5 años "normales" con totales cercanos entre sí: 8, 9, 10, 10, 11.
        registrarNCasos(clinica, cie10, "2019", 8, "V-D1-");
        registrarNCasos(clinica, cie10, "2020", 9, "V-D2-");
        registrarNCasos(clinica, cie10, "2021", 10, "V-D3-");
        registrarNCasos(clinica, cie10, "2022", 10, "V-D4-");
        registrarNCasos(clinica, cie10, "2023", 11, "V-D5-");
        // Un brote epidémico real y atípico: 60 casos en un solo año.
        registrarNCasos(clinica, cie10, "2024", 60, "V-D6-");

        ResponseEntity<JsonNode> canal = get(clinica, "/api/salud/canal-endemico?cie10=" + cie10 + "&anio=2026");
        assertEquals(HttpStatus.OK, canal.getStatusCode());

        JsonNode excluidos = canal.getBody().get("aniosExcluidosPorAtipicos");
        assertEquals(1, excluidos.size(), "Debe detectar exactamente 1 año atípico: " + excluidos);
        assertEquals(2024, excluidos.get(0).asInt(), "El año del brote (2024, 60 casos) debe quedar excluido");

        assertEquals(5, canal.getBody().get("aniosHistoricosUsados").asInt(),
            "Solo los 5 años normales deben contar como historia usada — el brote no debe inflar el denominador");

        JsonNode banda = canal.getBody().get("bandaReferenciaAnual");
        assertEquals(5, banda.get("aniosUsados").asInt());
        assertEquals(10.0, banda.get("mediana").asDouble(), 0.001,
            "La mediana debe salir SOLO de 8,9,10,10,11 — si el brote de 60 se hubiera colado, la mediana sería mucho más alta");
        assertTrue(banda.get("maximo").asDouble() < 20,
            "El máximo de la banda no debe reflejar el brote de 60 casos, o el umbral de alerta quedaría inflado para siempre");
    }

    @Test
    void elCanalDeUnMedicoNoIncluyeCasosDeOtraClinica() {
        Sesion clinicaA = registrarClinica("Clinica Canal A " + UUID.randomUUID());
        Sesion clinicaB = registrarClinica("Clinica Canal B " + UUID.randomUUID());

        String cie10 = "A90"; // dengue clásico (CIE-10)

        // Clinica A: 3 casos en la semana ISO del 9 al 15 de marzo de 2026, 2 casos en la semana siguiente.
        long pacA1 = registrarPaciente(clinicaA, "V-50000001", "Paciente", "A1");
        long pacA2 = registrarPaciente(clinicaA, "V-50000002", "Paciente", "A2");
        long pacA3 = registrarPaciente(clinicaA, "V-50000003", "Paciente", "A3");
        long pacA4 = registrarPaciente(clinicaA, "V-50000004", "Paciente", "A4");
        long pacA5 = registrarPaciente(clinicaA, "V-50000005", "Paciente", "A5");
        registrarConsultaConFechaYCie10(clinicaA, pacA1, "2026-03-10T09:00:00", cie10);
        registrarConsultaConFechaYCie10(clinicaA, pacA2, "2026-03-11T09:00:00", cie10);
        registrarConsultaConFechaYCie10(clinicaA, pacA3, "2026-03-12T09:00:00", cie10);
        registrarConsultaConFechaYCie10(clinicaA, pacA4, "2026-03-17T09:00:00", cie10);
        registrarConsultaConFechaYCie10(clinicaA, pacA5, "2026-03-18T09:00:00", cie10);

        // Clinica B: 10 casos del MISMO diagnóstico, en las MISMAS fechas — si hubiera
        // fuga entre tenants, aparecerían mezclados en el canal de la Clínica A.
        for (int i = 0; i < 10; i++) {
            long pacB = registrarPaciente(clinicaB, "V-6000000" + i, "Paciente", "B" + i);
            registrarConsultaConFechaYCie10(clinicaB, pacB, "2026-03-10T10:00:00", cie10);
        }

        ResponseEntity<JsonNode> canalA = get(clinicaA, "/api/salud/canal-endemico?cie10=" + cie10 + "&anio=2026");
        assertEquals(HttpStatus.OK, canalA.getStatusCode());
        assertEquals(5, canalA.getBody().get("totalCasosHistorico").asInt(),
            "El canal de la Clínica A debe ver SOLO sus 5 casos propios, no los 10 de la Clínica B");

        JsonNode semanas = canalA.getBody().get("semanasAnioConsultado");
        int totalEnSemanas = 0;
        for (JsonNode s : semanas) {
            totalEnSemanas += s.get("casos").asInt();
        }
        assertEquals(5, totalEnSemanas, "La suma de todas las semanas del año debe dar los 5 casos de la Clínica A");
    }

    @Test
    void elSuperAdminVeElCanalConsolidadoDeTodaLaRed() {
        Sesion clinicaA = registrarClinica("Clinica Red A " + UUID.randomUUID());
        Sesion clinicaB = registrarClinica("Clinica Red B " + UUID.randomUUID());
        String cie10 = "J11"; // influenza

        long pacA1 = registrarPaciente(clinicaA, "V-70000001", "Paciente", "RA1");
        long pacA2 = registrarPaciente(clinicaA, "V-70000002", "Paciente", "RA2");
        registrarConsultaConFechaYCie10(clinicaA, pacA1, "2026-05-04T09:00:00", cie10);
        registrarConsultaConFechaYCie10(clinicaA, pacA2, "2026-05-05T09:00:00", cie10);

        long pacB1 = registrarPaciente(clinicaB, "V-80000001", "Paciente", "RB1");
        long pacB2 = registrarPaciente(clinicaB, "V-80000002", "Paciente", "RB2");
        long pacB3 = registrarPaciente(clinicaB, "V-80000003", "Paciente", "RB3");
        registrarConsultaConFechaYCie10(clinicaB, pacB1, "2026-05-04T10:00:00", cie10);
        registrarConsultaConFechaYCie10(clinicaB, pacB2, "2026-05-06T10:00:00", cie10);
        registrarConsultaConFechaYCie10(clinicaB, pacB3, "2026-05-07T10:00:00", cie10);

        Sesion superAdmin = loginSuperAdmin();

        ResponseEntity<JsonNode> canalRed = get(superAdmin, "/api/super-admin/canal-endemico?cie10=" + cie10 + "&anio=2026");
        assertEquals(HttpStatus.OK, canalRed.getStatusCode(), "El super-admin debe poder ver el canal consolidado: " + canalRed.getBody());
        assertEquals(5, canalRed.getBody().get("totalCasosHistorico").asInt(),
            "El canal de red debe sumar los 2 casos de la Clínica A + los 3 de la Clínica B");

        ResponseEntity<JsonNode> desglose = get(superAdmin,
            "/api/super-admin/canal-endemico/desglose-por-clinica?cie10=" + cie10 + "&anio=2026");
        assertEquals(HttpStatus.OK, desglose.getStatusCode());
        assertEquals(2, desglose.getBody().size(), "Deben aparecer exactamente las 2 clínicas que reportaron este diagnóstico");

        long totalDesglosado = 0;
        for (JsonNode fila : desglose.getBody()) {
            totalDesglosado += fila.get("totalCasos").asLong();
        }
        assertEquals(5, totalDesglosado, "El desglose por clínica debe sumar exactamente el total consolidado (2 + 3)");

        // Una clínica normal (no super-admin) NO debe poder ver el endpoint de red.
        ResponseEntity<JsonNode> intentoClinica = get(clinicaA, "/api/super-admin/canal-endemico?cie10=" + cie10 + "&anio=2026");
        assertTrue(intentoClinica.getStatusCode().is4xxClientError(),
            "Una clínica normal no debe poder acceder al canal consolidado de toda la red");
    }
}
