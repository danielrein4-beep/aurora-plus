package com.auroraplus.modules.salud;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Prueba end-to-end del módulo Mediclinic/Salud simulando el uso real de una
 * clínica: varios pacientes distintos pasando por todo el flujo (registro →
 * cita → sala de espera → consulta → cobro) repetidas veces, un paciente que
 * regresa una segunda vez (debe reconocerse como ya registrado, sin
 * duplicarse, y con su historial completo), y dos verificaciones de riesgos
 * reales encontrados en la auditoría del módulo: aislamiento de datos entre
 * clínicas (tenants) distintas, e idempotencia de cobros ante reintentos.
 */
class SaludFlujoCompletoIntegrationTest extends SaludIntegrationTestBase {

    @Test
    void variosPacientesFlujoCompletoYPacienteQueRegresa() {
        Sesion clinica = registrarClinica("Clinica Los Robles " + UUID.randomUUID());

        record PacienteSimulado(String cedula, String nombres, String apellidos) {}

        List<PacienteSimulado> pacientes = List.of(
            new PacienteSimulado("V-10111222", "Maria", "Gonzalez"),
            new PacienteSimulado("V-20333444", "Carlos", "Perez"),
            new PacienteSimulado("V-30555666", "Ana", "Rodriguez")
        );

        // 1) Simular el flujo COMPLETO (registro -> cita -> sala de espera ->
        //    consulta -> cobro) para cada paciente, como en un día real de clínica.
        long[] idsPaciente = new long[pacientes.size()];
        int hora = 8;
        for (int i = 0; i < pacientes.size(); i++) {
            PacienteSimulado p = pacientes.get(i);
            String horaInicio = String.format("%02d:00:00", hora);
            String horaFin = String.format("%02d:30:00", hora);
            hora++;

            long pacienteId = registrarPaciente(clinica, p.cedula(), p.nombres(), p.apellidos());
            idsPaciente[i] = pacienteId;

            long citaId = agendarCita(clinica, pacienteId, "2026-09-10", horaInicio, horaFin);
            long entradaSalaId = post(clinica, "/api/salud/sala-espera/check-in",
                java.util.Map.of("paciente", java.util.Map.of("id", pacienteId), "citaId", citaId))
                .getBody().get("id").asLong();
            post(clinica, "/api/salud/sala-espera/" + entradaSalaId + "/llamar?consultorio=Consultorio%201", null);

            long consultaId = registrarConsulta(clinica, pacienteId, citaId);
            procesarCobro(clinica, pacienteId, consultaId, citaId, "cobro-" + p.cedula() + "-visita1", 25.00);

            post(clinica, "/api/salud/sala-espera/" + entradaSalaId + "/finalizar", null);
        }

        // Sanity check: la clínica ahora tiene exactamente 3 pacientes registrados.
        ResponseEntity<JsonNode> listaPacientes = get(clinica, "/api/salud/pacientes");
        assertEquals(3, listaPacientes.getBody().size(), "Deben existir exactamente los 3 pacientes simulados");

        // 2) "Vuelve un cliente que ya vino": Maria regresa para una SEGUNDA
        //    consulta. Debe ENCONTRARSE por su cédula (no crearse de nuevo).
        PacienteSimulado maria = pacientes.get(0);
        ResponseEntity<JsonNode> buscada = get(clinica, "/api/salud/pacientes/identificacion/" + maria.cedula());
        assertEquals(HttpStatus.OK, buscada.getStatusCode(), "El paciente que regresa debe encontrarse por cédula");
        long mariaId = buscada.getBody().get("id").asLong();
        assertEquals(idsPaciente[0], mariaId, "Debe ser EL MISMO registro de paciente, no uno nuevo");

        long segundaCitaId = agendarCita(clinica, mariaId, "2026-09-10", "14:00:00", "14:30:00");
        long segundaConsultaId = registrarConsulta(clinica, mariaId, segundaCitaId);
        procesarCobro(clinica, mariaId, segundaConsultaId, segundaCitaId, "cobro-" + maria.cedula() + "-visita2", 30.00);

        // Sigue habiendo solo 3 pacientes en la clínica (la segunda visita NO debió duplicar al paciente).
        ResponseEntity<JsonNode> listaPacientesFinal = get(clinica, "/api/salud/pacientes");
        assertEquals(3, listaPacientesFinal.getBody().size(),
            "La segunda visita de un paciente existente no debe crear un registro duplicado");

        // El historial de Maria debe mostrar sus DOS visitas completas.
        ResponseEntity<JsonNode> historialCitas = get(clinica, "/api/salud/agenda/paciente/" + mariaId);
        assertEquals(2, historialCitas.getBody().size(), "El historial de citas de Maria debe tener 2 entradas");

        ResponseEntity<JsonNode> historialConsultas = get(clinica, "/api/salud/consultas/paciente/" + mariaId);
        assertEquals(2, historialConsultas.getBody().size(), "El historial clínico de Maria debe tener 2 consultas");

        ResponseEntity<JsonNode> historialCobros = get(clinica, "/api/salud/cobros/paciente/" + mariaId);
        assertEquals(2, historialCobros.getBody().size(), "El historial de cobros de Maria debe tener 2 pagos registrados");

        double totalCobradoMaria = 0;
        for (JsonNode c : historialCobros.getBody()) {
            totalCobradoMaria += c.get("montoTotal").asDouble();
        }
        assertEquals(55.00, totalCobradoMaria, 0.001, "Maria debió pagar 25 + 30 = 55 en total entre sus dos visitas");
    }

    @Test
    void unaClinicaNoPuedeVerPacientesDeOtraClinica() {
        Sesion clinicaA = registrarClinica("Clinica A " + UUID.randomUUID());
        Sesion clinicaB = registrarClinica("Clinica B " + UUID.randomUUID());

        registrarPaciente(clinicaA, "V-11111111", "Pedro", "Ramirez");
        registrarPaciente(clinicaB, "V-22222222", "Lucia", "Fernandez");

        ResponseEntity<JsonNode> pacientesDeA = get(clinicaA, "/api/salud/pacientes");
        assertEquals(1, pacientesDeA.getBody().size(), "La clínica A solo debe ver a SU paciente");
        assertEquals("V-11111111", pacientesDeA.getBody().get(0).get("identificacion").asText());

        ResponseEntity<JsonNode> pacientesDeB = get(clinicaB, "/api/salud/pacientes");
        assertEquals(1, pacientesDeB.getBody().size(), "La clínica B solo debe ver a SU paciente");
        assertEquals("V-22222222", pacientesDeB.getBody().get(0).get("identificacion").asText());

        // La clínica A no debe poder buscar por cédula a un paciente que es de la clínica B.
        ResponseEntity<JsonNode> intentoCruzado = get(clinicaA, "/api/salud/pacientes/identificacion/V-22222222");
        assertEquals(HttpStatus.NOT_FOUND, intentoCruzado.getStatusCode(),
            "Una clínica NO debe poder encontrar pacientes de otra clínica distinta");
    }

    @Test
    void reintentarElMismoCobroNoLoDuplica() {
        Sesion clinica = registrarClinica("Clinica Idempotencia " + UUID.randomUUID());
        long pacienteId = registrarPaciente(clinica, "V-99999999", "Jose", "Martinez");
        long citaId = agendarCita(clinica, pacienteId, "2026-09-10", "09:00:00", "09:30:00");
        long consultaId = registrarConsulta(clinica, pacienteId, citaId);

        String claveIdempotencia = "reintento-" + UUID.randomUUID();

        JsonNode primerIntento = procesarCobro(clinica, pacienteId, consultaId, citaId, claveIdempotencia, 40.00);
        // Simula un reintento de red del POS de recepción con la MISMA clave.
        JsonNode segundoIntento = procesarCobro(clinica, pacienteId, consultaId, citaId, claveIdempotencia, 40.00);

        assertEquals(primerIntento.get("id").asLong(), segundoIntento.get("id").asLong(),
            "El reintento debe devolver el MISMO cobro ya registrado, no crear uno nuevo");

        ResponseEntity<JsonNode> historialCobros = get(clinica, "/api/salud/cobros/paciente/" + pacienteId);
        assertEquals(1, historialCobros.getBody().size(),
            "El paciente debe tener UN SOLO cobro registrado a pesar del reintento");
    }
}
