package com.auroraplus.modules.salud;

import com.auroraplus.modules.pacientesapp.entities.CodigoAccesoPaciente;
import com.auroraplus.modules.pacientesapp.repositories.CodigoAccesoPacienteRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.test.context.TestPropertySource;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Flujo completo de Mediclinic Pacientes contra la app real: el consultorio se publica,
 * el paciente crea su cuenta con código, pide cita, la recepción la acepta y la cita
 * aparece en la agenda de Mediclinic. También cubre que los tokens no se crucen.
 */
@TestPropertySource(properties = {"aurora.pacientes-app.habilitada=true", "VERIFICACION_SIMULAR_ENVIO=true"})
class PacientesAppFlujoTest extends SaludIntegrationTestBase {

    @Autowired
    private CodigoAccesoPacienteRepository codigos;

    @Test
    void pacientePideCitaYLaClinicaLaAcepta() throws Exception {
        Sesion clinica = registrarClinica("Consultorio App Pacientes");

        // 1. El consultorio se publica en el directorio.
        Map<String, Object> perfil = new LinkedHashMap<>();
        perfil.put("publicado", true);
        perfil.put("trato", "Dra.");
        perfil.put("especialidad", "cardiologia");
        perfil.put("ciudad", "Caracas");
        perfil.put("precioConsulta", 60);
        perfil.put("moneda", "USD");
        perfil.put("aceptaMensajes", false);
        perfil.put("confirmacionAutomatica", false);
        perfil.put("horaInicio", "08:00");
        perfil.put("horaFin", "18:00");
        perfil.put("duracionMinutos", 30);
        perfil.put("diasAtencion", "1,2,3,4,5,6,7");
        ResponseEntity<JsonNode> guardado = rest.exchange(url("/api/salud/app-pacientes/perfil"), HttpMethod.PUT,
            new HttpEntity<>(perfil, headers(clinica)), JsonNode.class);
        assertEquals(HttpStatus.OK, guardado.getStatusCode(), "Guardar perfil: " + guardado.getBody());

        ResponseEntity<JsonNode> directorio = rest.getForEntity(url("/api/pacientes/v1/directorio/medicos"), JsonNode.class);
        assertEquals(HttpStatus.OK, directorio.getStatusCode());
        boolean aparece = false;
        for (JsonNode m : directorio.getBody()) aparece |= m.get("id").asLong() == clinica.tenantId();
        assertTrue(aparece, "El consultorio publicado debe aparecer en el directorio");

        // 2. El paciente crea su cuenta con código.
        Map<String, Object> pedir = Map.of("cedula", "V-24.815.678", "telefono", "0414 1234567", "nombre", "María Gómez", "crearCuenta", true);
        ResponseEntity<JsonNode> enviado = rest.postForEntity(url("/api/pacientes/v1/auth/codigo"), pedir, JsonNode.class);
        assertEquals(HttpStatus.OK, enviado.getStatusCode(), "Pedir código: " + enviado.getBody());
        assertTrue(enviado.getBody().get("simulado").asBoolean());

        // El código real solo va al log; en la prueba se fija uno conocido.
        CodigoAccesoPaciente c = codigos.findFirstByCedulaAndUsadoFalseOrderByCreadoEnDesc("V24815678").orElseThrow();
        c.setCodigoHash(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest("123456".getBytes(StandardCharsets.UTF_8))));
        codigos.save(c);

        ResponseEntity<JsonNode> malo = rest.postForEntity(url("/api/pacientes/v1/auth/verificar"), Map.of("cedula", "24815678", "codigo", "000000"), JsonNode.class);
        assertEquals(HttpStatus.BAD_REQUEST, malo.getStatusCode(), "Un código equivocado no debe entrar");

        ResponseEntity<JsonNode> sesionResp = rest.postForEntity(url("/api/pacientes/v1/auth/verificar"), Map.of("cedula", "24815678", "codigo", "123456"), JsonNode.class);
        assertEquals(HttpStatus.OK, sesionResp.getStatusCode(), "Verificar: " + sesionResp.getBody());
        String tokenPaciente = sesionResp.getBody().get("token").asText();
        HttpHeaders hp = new HttpHeaders();
        hp.setContentType(MediaType.APPLICATION_JSON);
        hp.setBearerAuth(tokenPaciente);

        // 3. Los tokens no se cruzan.
        assertEquals(HttpStatus.UNAUTHORIZED, get(clinica, "/api/pacientes/v1/citas").getStatusCode(), "El token de la clínica no sirve en la app");
        assertEquals(HttpStatus.UNAUTHORIZED, rest.exchange(url("/api/salud/pacientes"), HttpMethod.GET, new HttpEntity<>(hp), JsonNode.class).getStatusCode(),
            "El token del paciente no sirve en Mediclinic");

        // 4. Pide una hora libre de mañana.
        String manana = LocalDate.now().plusDays(1).toString();
        ResponseEntity<JsonNode> horas = rest.getForEntity(url("/api/pacientes/v1/directorio/medicos/" + clinica.tenantId() + "/horarios?fecha=" + manana), JsonNode.class);
        String hora = null;
        for (JsonNode h : horas.getBody()) if (h.get("libre").asBoolean()) { hora = h.get("hora").asText(); break; }
        assertNotNull(hora, "Debe haber horas libres mañana");

        Map<String, Object> solicitud = Map.of("medicoId", clinica.tenantId(), "fecha", manana, "hora", hora, "motivo", "Control de tensión");
        ResponseEntity<JsonNode> pedida = rest.exchange(url("/api/pacientes/v1/citas/solicitar"), HttpMethod.POST, new HttpEntity<>(solicitud, hp), JsonNode.class);
        assertEquals(HttpStatus.OK, pedida.getStatusCode(), "Solicitar: " + pedida.getBody());
        assertEquals("SOLICITADA", pedida.getBody().get("estado").asText());
        long solicitudId = pedida.getBody().get("id").asLong();

        ResponseEntity<JsonNode> repetida = rest.exchange(url("/api/pacientes/v1/citas/solicitar"), HttpMethod.POST, new HttpEntity<>(solicitud, hp), JsonNode.class);
        assertEquals(HttpStatus.BAD_REQUEST, repetida.getStatusCode(), "La misma hora no se puede pedir dos veces");

        // 5. Otro consultorio no puede tocar la solicitud.
        Sesion otra = registrarClinica("Otro Consultorio");
        assertEquals(HttpStatus.BAD_REQUEST, post(otra, "/api/salud/app-pacientes/solicitudes/" + solicitudId + "/aceptar", Map.of()).getStatusCode());

        // 6. La recepción la ve y la acepta: se vuelve cita real.
        ResponseEntity<JsonNode> bandeja = get(clinica, "/api/salud/app-pacientes/solicitudes");
        assertEquals(HttpStatus.OK, bandeja.getStatusCode());
        assertEquals(1, bandeja.getBody().size());
        ResponseEntity<JsonNode> aceptada = post(clinica, "/api/salud/app-pacientes/solicitudes/" + solicitudId + "/aceptar", Map.of());
        assertEquals(HttpStatus.OK, aceptada.getStatusCode(), "Aceptar: " + aceptada.getBody());
        assertEquals("ACEPTADA", aceptada.getBody().get("estado").asText());

        ResponseEntity<JsonNode> agenda = get(clinica, "/api/salud/agenda?fecha=" + manana);
        JsonNode citaEnAgenda = null;
        for (JsonNode cita : agenda.getBody()) {
            if ("V-24815678".equals(cita.get("paciente").get("identificacion").asText())) citaEnAgenda = cita;
        }
        assertNotNull(citaEnAgenda, "La cita debe aparecer en la agenda de Mediclinic");
        long pacienteFichaId = citaEnAgenda.get("paciente").get("id").asLong();
        long citaId = citaEnAgenda.get("id").asLong();

        // 8. El paciente sube la foto de un examen: cae en la bandeja de exámenes de Mediclinic.
        String pngMinimo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        Map<String, Object> examen = Map.of("medicoId", clinica.tenantId(), "nota", "Hematología",
            "archivos", java.util.List.of(Map.of("nombre", "hemo.png", "tipo", "image/png", "datosBase64", pngMinimo)));
        ResponseEntity<JsonNode> subido = rest.exchange(url("/api/pacientes/v1/examenes"), HttpMethod.POST, new HttpEntity<>(examen, hp), JsonNode.class);
        assertEquals(HttpStatus.OK, subido.getStatusCode(), "Subir examen: " + subido.getBody());
        assertFalse(subido.getBody().get("revisado").asBoolean());
        long examenId = subido.getBody().get("id").asLong();

        Map<String, Object> falso = Map.of("medicoId", clinica.tenantId(),
            "archivos", java.util.List.of(Map.of("nombre", "virus.png", "tipo", "image/png", "datosBase64", "data:image/png;base64,TVqQAAMAAAAEAAAA")));
        assertEquals(HttpStatus.BAD_REQUEST, rest.exchange(url("/api/pacientes/v1/examenes"), HttpMethod.POST, new HttpEntity<>(falso, hp), JsonNode.class).getStatusCode(),
            "Un archivo que no es imagen ni PDF se rechaza aunque diga image/png");
        assertEquals(HttpStatus.BAD_REQUEST, rest.exchange(url("/api/pacientes/v1/examenes"), HttpMethod.POST,
            new HttpEntity<>(Map.of("medicoId", otra.tenantId(), "archivos", examen.get("archivos")), hp), JsonNode.class).getStatusCode(),
            "No se pueden mandar exámenes a un consultorio sin cita con él");

        ResponseEntity<JsonNode> inbox = get(clinica, "/api/salud/laboratorio/inbox/paciente/" + pacienteFichaId);
        assertEquals(1, inbox.getBody().size(), "El examen debe aparecer en la ficha del paciente en Mediclinic");
        assertEquals(HttpStatus.OK, post(clinica, "/api/salud/laboratorio/inbox/" + examenId + "/marcar-leido", Map.of()).getStatusCode());
        ResponseEntity<JsonNode> misExamenes = rest.exchange(url("/api/pacientes/v1/examenes"), HttpMethod.GET, new HttpEntity<>(hp), JsonNode.class);
        assertTrue(misExamenes.getBody().get(0).get("revisado").asBoolean(), "El paciente ve que el médico ya lo revisó");

        // 9. El médico comparte el plan de la consulta; las notas privadas nunca salen.
        Map<String, Object> consulta = new LinkedHashMap<>();
        consulta.put("paciente", Map.of("id", pacienteFichaId));
        consulta.put("citaId", citaId);
        consulta.put("motivoConsulta", "Control de tensión");
        consulta.put("descripcionDiagnostico", "Hipertensión arterial leve");
        consulta.put("planTratamiento", "Dieta baja en sal y caminar 30 minutos diarios");
        consulta.put("recipeMedicamentos", "Losartán 50 mg, una diaria");
        consulta.put("anotacionesPrivadas", "NOTA PRIVADA QUE NO DEBE SALIR");
        long consultaId = post(clinica, "/api/salud/consultas", consulta).getBody().get("id").asLong();

        ResponseEntity<JsonNode> planesAntes = rest.exchange(url("/api/pacientes/v1/planes"), HttpMethod.GET, new HttpEntity<>(hp), JsonNode.class);
        assertEquals(0, planesAntes.getBody().size(), "Nada se ve hasta que el médico lo comparte");

        assertTrue(get(clinica, "/api/salud/app-pacientes/consultas/" + consultaId + "/compartido").getBody().get("pacienteUsaLaApp").asBoolean());
        ResponseEntity<JsonNode> compartido = post(clinica, "/api/salud/app-pacientes/consultas/" + consultaId + "/compartir", Map.of("incluirDiagnostico", false));
        assertEquals(HttpStatus.OK, compartido.getStatusCode(), "Compartir: " + compartido.getBody());
        assertEquals(HttpStatus.BAD_REQUEST, post(otra, "/api/salud/app-pacientes/consultas/" + consultaId + "/compartir", Map.of()).getStatusCode(),
            "Otro consultorio no puede compartir consultas ajenas");

        ResponseEntity<JsonNode> planes = rest.exchange(url("/api/pacientes/v1/planes"), HttpMethod.GET, new HttpEntity<>(hp), JsonNode.class);
        assertEquals(1, planes.getBody().size());
        JsonNode plan = planes.getBody().get(0);
        assertEquals("Dieta baja en sal y caminar 30 minutos diarios", plan.get("planTratamiento").asText());
        assertTrue(plan.get("diagnostico").isNull(), "El diagnóstico solo sale si el médico lo elige");
        assertFalse(planes.getBody().toString().contains("NOTA PRIVADA"), "Las anotaciones privadas nunca llegan a la app");

        ResponseEntity<JsonNode> misCitas = rest.exchange(url("/api/pacientes/v1/citas"), HttpMethod.GET, new HttpEntity<>(hp), JsonNode.class);
        // Registrar la consulta marcó la cita como atendida en Mediclinic, y la app lo refleja.
        assertEquals("ATENDIDA", misCitas.getBody().get(0).get("estado").asText());

        // 7. Ya no se ofrece esa hora a nadie más.
        ResponseEntity<JsonNode> horasDespues = rest.getForEntity(url("/api/pacientes/v1/directorio/medicos/" + clinica.tenantId() + "/horarios?fecha=" + manana), JsonNode.class);
        for (JsonNode h : horasDespues.getBody()) {
            if (h.get("hora").asText().equals(hora)) assertFalse(h.get("libre").asBoolean(), "La hora aceptada ya no debe estar libre");
        }
    }
}
