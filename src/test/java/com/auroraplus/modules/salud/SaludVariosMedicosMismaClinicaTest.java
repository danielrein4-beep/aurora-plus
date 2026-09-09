package com.auroraplus.modules.salud;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Documenta (no "arregla") un límite de diseño INTENCIONAL de Mediclinic:
 * el producto está pensado como un médico = un tenant/cuenta, cada uno con
 * su propio consultorio aislado en la nube (ver MedicoTenantResolver y
 * SaludStressMultiTenantTest, que prueba a MUCHOS médicos-tenant distintos
 * trabajando en paralelo sin errores — ese SÍ es el modelo real soportado).
 *
 * Este test fija el comportamiento actual cuando alguien intenta meter DOS
 * médicos bajo UNA sola cuenta: el sistema los trata como si fueran el mismo
 * médico compartiendo una sola agenda, así que dos citas reales y válidas en
 * el mismo horario (cada una con un doctor distinto) chocan entre sí como si
 * fueran un choque de horario real. Es un comportamiento esperado dado el
 * alcance actual del producto, no un defecto — este test existe para que, si
 * en el futuro alguien decide sí soportar clínicas multi-médico, este test
 * falle y avise que el supuesto de diseño cambió a propósito.
 */
class SaludVariosMedicosMismaClinicaTest extends SaludIntegrationTestBase {

    @Test
    void dosMedicosEnUnaSolaCuentaComparenLaMismaAgenda() {
        Sesion clinica = registrarClinica("Clinica Dos Doctores " + UUID.randomUUID());

        // La cuenta agrega un segundo usuario con rol MEDICO (soportado a
        // nivel de gestión de usuarios, aunque la agenda no los distinga).
        Map<String, Object> nuevoMedico = new LinkedHashMap<>();
        nuevoMedico.put("username", "dra.segunda@test.com");
        nuevoMedico.put("password", "clave123");
        nuevoMedico.put("rol", "MEDICO");
        nuevoMedico.put("nombreCompleto", "Dra. Segunda Doctora");

        ResponseEntity<JsonNode> altaSegundoMedico = post(clinica,
            "/api/auth/usuarios?tenantId=" + clinica.tenantId(), nuevoMedico);
        assertEquals(HttpStatus.OK, altaSegundoMedico.getStatusCode(),
            "Dar de alta un segundo usuario con rol MEDICO en la cuenta SÍ funciona");

        long pacienteUno = registrarPaciente(clinica, "V-40000001", "Pedro", "Uno");
        agendarCita(clinica, pacienteUno, "2026-09-20", "09:00:00", "09:30:00");

        // Una segunda cita en el MISMO horario, pensada como si fuera para el
        // segundo médico: hoy la cuenta comparte una sola agenda, así que
        // esto se rechaza como choque de horario — comportamiento correcto
        // para el alcance actual (un médico por cuenta), NO soporte real de
        // multi-médico bajo un mismo tenant.
        long pacienteDos = registrarPaciente(clinica, "V-40000002", "Ana", "Dos");
        ResponseEntity<JsonNode> respuestaCitaDos = post(clinica, "/api/salud/agenda/citas",
            Map.of("paciente", Map.of("id", pacienteDos),
                "fecha", "2026-09-20", "horaInicio", "09:00:00", "horaFin", "09:30:00",
                "motivo", "Consulta con la Dra. Segunda"));

        assertEquals(HttpStatus.BAD_REQUEST, respuestaCitaDos.getStatusCode(),
            "Bajo el alcance actual (un médico por cuenta), dos citas en el mismo horario "
                + "chocan como si fueran el mismo médico. Si este assert falla, el "
                + "comportamiento de agenda multi-médico cambió — revisar si fue intencional.");
    }
}
