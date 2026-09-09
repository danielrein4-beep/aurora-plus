package com.auroraplus.modules.salud;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Assertions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Base compartida por los tests de integración del módulo Salud/Mediclinic:
 * arranca la app completa (Tomcat real + H2 en memoria) y expone los mismos
 * helpers HTTP que usaría un cliente real (recepción/POS) — login de clínica,
 * paciente, cita, sala de espera, consulta y cobro — para no repetir este
 * cableado en cada clase de test.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
abstract class SaludIntegrationTestBase {

    @LocalServerPort
    protected int puerto;

    @Autowired
    protected TestRestTemplate rest;

    protected final ObjectMapper mapper = new ObjectMapper();

    protected record Sesion(String token, long tenantId) {}

    protected String url(String path) {
        return "http://localhost:" + puerto + path;
    }

    protected Sesion registrarClinica(String nombreEmpresa) {
        Map<String, Object> body = Map.of(
            "nombreEmpresa", nombreEmpresa,
            "moduloPrincipal", "salud",
            "emailContacto", "contacto@" + nombreEmpresa.toLowerCase().replaceAll("[^a-z0-9]", "") + ".test",
            "telefonoContacto", "0414-0000000",
            "username", "medico-" + UUID.randomUUID() + "@test.com",
            "password", "clave123"
        );
        ResponseEntity<JsonNode> resp = rest.postForEntity(url("/api/auth/registro-negocio"), body, JsonNode.class);
        Assertions.assertEquals(HttpStatus.OK, resp.getStatusCode(), "El registro de la clínica debe responder 200: " + resp.getBody());
        JsonNode j = resp.getBody();
        Assertions.assertNotNull(j);
        return new Sesion(j.get("token").asText(), j.get("tenantId").asLong());
    }

    protected HttpHeaders headers(Sesion sesion) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        h.setBearerAuth(sesion.token());
        return h;
    }

    protected <T> ResponseEntity<JsonNode> post(Sesion sesion, String path, T body) {
        return rest.exchange(url(path), HttpMethod.POST, new HttpEntity<>(body, headers(sesion)), JsonNode.class);
    }

    protected ResponseEntity<JsonNode> get(Sesion sesion, String path) {
        return rest.exchange(url(path), HttpMethod.GET, new HttpEntity<>(headers(sesion)), JsonNode.class);
    }

    protected long registrarPaciente(Sesion sesion, String identificacion, String nombres, String apellidos) {
        Map<String, Object> paciente = new LinkedHashMap<>();
        paciente.put("identificacion", identificacion);
        paciente.put("nombres", nombres);
        paciente.put("apellidos", apellidos);
        paciente.put("fechaNacimiento", "1990-05-15");
        paciente.put("genero", "FEMENINO");
        paciente.put("telefono", "0424-1234567");
        paciente.put("email", (nombres + "." + identificacion).toLowerCase().replaceAll("[^a-z0-9.]", "") + "@test.com");

        ResponseEntity<JsonNode> resp = post(sesion, "/api/salud/pacientes", paciente);
        Assertions.assertEquals(HttpStatus.OK, resp.getStatusCode(), "Registrar paciente debe responder 200: " + resp.getBody());
        return resp.getBody().get("id").asLong();
    }

    protected long agendarCita(Sesion sesion, long pacienteId, String fecha, String horaInicio, String horaFin) {
        Map<String, Object> cita = new LinkedHashMap<>();
        cita.put("paciente", Map.of("id", pacienteId));
        cita.put("fecha", fecha);
        cita.put("horaInicio", horaInicio);
        cita.put("horaFin", horaFin);
        cita.put("especialidad", "Medicina General");
        cita.put("motivo", "Control de rutina");
        cita.put("costoEstimado", 25.00);
        cita.put("moneda", "USD");

        ResponseEntity<JsonNode> resp = post(sesion, "/api/salud/agenda/citas", cita);
        Assertions.assertEquals(HttpStatus.OK, resp.getStatusCode(), "Agendar cita debe responder 200: " + resp.getBody());
        return resp.getBody().get("id").asLong();
    }

    protected long registrarConsulta(Sesion sesion, long pacienteId, long citaId) {
        Map<String, Object> consulta = new LinkedHashMap<>();
        consulta.put("paciente", Map.of("id", pacienteId));
        consulta.put("citaId", citaId);
        consulta.put("motivoConsulta", "Control de rutina");
        consulta.put("presionArterial", "120/80");
        consulta.put("frecuenciaCardiaca", 72);
        consulta.put("pesoKg", 65.0);
        consulta.put("tallaM", 1.65);
        consulta.put("diagnosticoPrincipalCIE10", "Z00.0");
        consulta.put("descripcionDiagnostico", "Examen general sin hallazgos relevantes");
        consulta.put("planTratamiento", "Control en 6 meses");

        ResponseEntity<JsonNode> resp = post(sesion, "/api/salud/consultas", consulta);
        Assertions.assertEquals(HttpStatus.OK, resp.getStatusCode(), "Registrar consulta debe responder 200: " + resp.getBody());
        return resp.getBody().get("id").asLong();
    }

    protected JsonNode procesarCobro(Sesion sesion, long pacienteId, long consultaId, long citaId, String claveIdempotencia, double monto) {
        Map<String, Object> cobro = new LinkedHashMap<>();
        cobro.put("claveIdempotencia", claveIdempotencia);
        cobro.put("pacienteId", pacienteId);
        cobro.put("consultaId", consultaId);
        cobro.put("citaId", citaId);
        cobro.put("concepto", "Consulta de control");
        cobro.put("montoTotal", monto);
        cobro.put("monedaCobrada", "USD");
        cobro.put("montoRecibido", monto);
        cobro.put("monedaPago", "USD");
        cobro.put("metodoPago", "EFECTIVO");

        ResponseEntity<JsonNode> resp = post(sesion, "/api/salud/cobros", cobro);
        Assertions.assertEquals(HttpStatus.OK, resp.getStatusCode(), "Procesar cobro debe responder 200: " + resp.getBody());
        Assertions.assertEquals("PAGADO", resp.getBody().get("estado").asText());
        return resp.getBody();
    }
}
