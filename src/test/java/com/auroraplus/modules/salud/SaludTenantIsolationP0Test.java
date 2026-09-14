package com.auroraplus.modules.salud;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.entities.ConsultaMedica;
import com.auroraplus.modules.salud.entities.CitaMedica;
import com.auroraplus.modules.salud.entities.BloqueoAgenda;
import com.auroraplus.modules.salud.entities.Paciente;
import com.auroraplus.modules.salud.entities.SalaEspera;
import com.auroraplus.modules.salud.services.ConsultaMedicaService;
import com.auroraplus.modules.salud.services.AgendaMedicaService;
import com.auroraplus.modules.salud.services.PacienteService;
import com.auroraplus.modules.salud.services.SalaEsperaService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Hardening de aislamiento por tenant (piloto P0, docs/auditoría tenantId) — PacienteController,
 * ConsultaMedicaController, SalaEsperaController y sus servicios. Cada prueba confirma que el
 * tenant B NO puede leer, listar, crear asociado a un id de A, editar, finalizar ni borrar datos
 * del tenant A, y que el tenant A sigue operando normal sobre lo suyo. No usa
 * SaludIntegrationTestBase (registro de clínica real vía HTTP) a propósito: eso depende de
 * pg_advisory_xact_lock, incompatible con H2 (ver hallazgo aparte) — estas pruebas llaman
 * directo a los servicios ya corregidos, con TenantContext seteado a mano, igual que el resto de
 * la suite de este proyecto.
 */
@SpringBootTest
@ActiveProfiles("test")
class SaludTenantIsolationP0Test {

    @Autowired private PacienteService pacienteService;
    @Autowired private ConsultaMedicaService consultaMedicaService;
    @Autowired private SalaEsperaService salaEsperaService;
    @Autowired private AgendaMedicaService agendaMedicaService;

    @AfterEach
    void limpiarContexto() {
        TenantContext.clear();
    }

    private Paciente nuevoPaciente(String identificacion, String nombres) {
        Paciente p = new Paciente();
        p.setIdentificacion(identificacion);
        p.setNombres(nombres);
        p.setApellidos("Apellido");
        return p;
    }

    // ── PacienteController / PacienteService ────────────────────────────────────────────────

    @Test
    void tenantBNoPuedeListarPacientesDeA() {
        long tenantA = 97001L, tenantB = 97002L;
        Paciente pA = pacienteService.crear(tenantA, nuevoPaciente("V-1001", "Paciente A"));

        assertTrue(pacienteService.buscar(tenantA, null).stream().anyMatch(p -> p.getId().equals(pA.getId())));
        assertTrue(pacienteService.buscar(tenantB, null).isEmpty(), "El tenant B no debe ver ningún paciente de A");
    }

    @Test
    void tenantBNoPuedeLeerPacienteDeAPorIdNiPorIdentificacion() {
        long tenantA = 97003L, tenantB = 97004L;
        Paciente pA = pacienteService.crear(tenantA, nuevoPaciente("V-2001", "Paciente A"));

        assertTrue(pacienteService.obtenerPorId(tenantB, pA.getId()).isEmpty(), "Tenant B no debe leer el paciente de A por id");
        assertTrue(pacienteService.obtenerPorIdentificacion(tenantB, "V-2001").isEmpty(), "Tenant B no debe encontrar al paciente de A por identificación");

        assertTrue(pacienteService.obtenerPorId(tenantA, pA.getId()).isPresent(), "Tenant A sí debe poder leer el suyo");
    }

    @Test
    void tenantBNoPuedeEditarPacienteDeA() {
        long tenantA = 97005L, tenantB = 97006L;
        Paciente pA = pacienteService.crear(tenantA, nuevoPaciente("V-3001", "Paciente A"));

        Paciente intentoEdicion = nuevoPaciente("V-3001", "Hackeado");
        assertThrows(RuntimeException.class, () -> pacienteService.actualizar(tenantB, pA.getId(), intentoEdicion));

        Paciente releido = pacienteService.obtenerPorId(tenantA, pA.getId()).orElseThrow();
        assertEquals("Paciente A", releido.getNombres(), "El nombre original no debe haber cambiado");
    }

    @Test
    void tenantBNoPuedeBorrarPacienteDeA() {
        long tenantA = 97007L, tenantB = 97008L;
        Paciente pA = pacienteService.crear(tenantA, nuevoPaciente("V-4001", "Paciente A"));

        assertThrows(RuntimeException.class, () -> pacienteService.desactivar(tenantB, pA.getId()));

        Paciente releido = pacienteService.obtenerPorId(tenantA, pA.getId()).orElseThrow();
        assertTrue(releido.isActivo(), "El paciente de A debe seguir activo — B no logró desactivarlo");
    }

    @Test
    void crearPacienteSiempreEsInsertNuncaSobrescribeOtroTenantAunqueElBodyTraigaUnIdAjeno() {
        long tenantA = 97009L, tenantB = 97010L;
        Paciente pA = pacienteService.crear(tenantA, nuevoPaciente("V-5001", "Paciente Original de A"));

        Paciente intento = nuevoPaciente("V-5002", "Intento de B");
        intento.setId(pA.getId()); // atacante manda el id de A en el body de un POST de B
        Paciente creado = pacienteService.crear(tenantB, intento);

        assertNotEquals(pA.getId(), creado.getId(), "crear() debe forzar un INSERT nuevo, nunca reusar/sobrescribir el id de otro tenant");
        Paciente originalReleido = pacienteService.obtenerPorId(tenantA, pA.getId()).orElseThrow();
        assertEquals("Paciente Original de A", originalReleido.getNombres(), "El paciente original de A no debe haberse tocado");
    }

    // ── ConsultaMedicaController / ConsultaMedicaService ────────────────────────────────────

    @Test
    void tenantBNoPuedeListarHistorialNiAgendaDeMedicoDeA() {
        long tenantA = 97011L, tenantB = 97012L;
        Paciente pA = pacienteService.crear(tenantA, nuevoPaciente("V-6001", "Paciente A"));
        ConsultaMedica consultaA = nuevaConsulta(pA, 501L, "Motivo A");
        consultaMedicaService.registrarConsulta(tenantA, consultaA);

        assertFalse(consultaMedicaService.historialPorPaciente(tenantA, pA.getId()).isEmpty());
        assertTrue(consultaMedicaService.historialPorPaciente(tenantB, pA.getId()).isEmpty(),
            "Tenant B no debe ver el historial clínico del paciente de A");
        assertTrue(consultaMedicaService.listarPorMedico(tenantB, 501L).isEmpty(),
            "Tenant B no debe ver la agenda del médico de A");
    }

    @Test
    void tenantBNoPuedeLeerConsultaDeAPorId() {
        long tenantA = 97013L, tenantB = 97014L;
        Paciente pA = pacienteService.crear(tenantA, nuevoPaciente("V-7001", "Paciente A"));
        ConsultaMedica guardada = consultaMedicaService.registrarConsulta(tenantA, nuevaConsulta(pA, 502L, "Motivo A"));

        TenantContext.setCurrentTenant(tenantB);
        assertTrue(consultaMedicaService.obtenerPorId(guardada.getId()).isEmpty(), "Tenant B no debe leer la consulta de A");

        TenantContext.setCurrentTenant(tenantA);
        assertTrue(consultaMedicaService.obtenerPorId(guardada.getId()).isPresent());
    }

    @Test
    void tenantBNoPuedeCrearConsultaAsociadaAPacienteDeA() {
        long tenantA = 97015L, tenantB = 97016L;
        Paciente pA = pacienteService.crear(tenantA, nuevoPaciente("V-8001", "Paciente A"));

        ConsultaMedica intento = nuevaConsulta(pA, 503L, "Intento de B sobre paciente ajeno");
        assertThrows(RuntimeException.class, () -> consultaMedicaService.registrarConsulta(tenantB, intento));
    }

    @Test
    void tenantBNoPuedeEliminarConsultaDeA() {
        long tenantA = 97017L, tenantB = 97018L;
        Paciente pA = pacienteService.crear(tenantA, nuevoPaciente("V-9001", "Paciente A"));
        ConsultaMedica guardada = consultaMedicaService.registrarConsulta(tenantA, nuevaConsulta(pA, 504L, "Motivo A"));

        TenantContext.setCurrentTenant(tenantB);
        assertThrows(RuntimeException.class, () -> consultaMedicaService.eliminarConsulta(guardada.getId()));

        TenantContext.setCurrentTenant(tenantA);
        assertTrue(consultaMedicaService.obtenerPorId(guardada.getId()).isPresent(), "La consulta de A debe seguir existiendo");
    }

    private ConsultaMedica nuevaConsulta(Paciente paciente, Long medicoId, String motivo) {
        ConsultaMedica c = new ConsultaMedica();
        Paciente ref = new Paciente();
        ref.setId(paciente.getId());
        c.setPaciente(ref);
        c.setMedicoId(medicoId);
        c.setMotivoConsulta(motivo);
        return c;
    }

    // ── SalaEsperaController / SalaEsperaService ────────────────────────────────────────────

    @Test
    void tenantBNoPuedeVerColaDeEsperaDeA() {
        long tenantA = 97019L, tenantB = 97020L;
        Paciente pA = pacienteService.crear(tenantA, nuevoPaciente("V-10001", "Paciente A"));
        salaEsperaService.checkIn(tenantA, nuevaEntradaSala(pA));

        assertFalse(salaEsperaService.listarColaActiva(tenantA).isEmpty());
        assertTrue(salaEsperaService.listarColaActiva(tenantB).isEmpty(), "Tenant B no debe ver la cola de espera de A");
    }

    @Test
    void tenantBNoPuedeHacerCheckInConPacienteDeA() {
        long tenantA = 97021L, tenantB = 97022L;
        Paciente pA = pacienteService.crear(tenantA, nuevoPaciente("V-11001", "Paciente A"));

        SalaEspera intento = nuevaEntradaSala(pA);
        assertThrows(RuntimeException.class, () -> salaEsperaService.checkIn(tenantB, intento));
    }

    @Test
    void tenantBNoPuedeLlamarNiFinalizarEntradaDeSalaDeA() {
        long tenantA = 97023L, tenantB = 97024L;
        Paciente pA = pacienteService.crear(tenantA, nuevoPaciente("V-12001", "Paciente A"));
        SalaEspera entradaA = salaEsperaService.checkIn(tenantA, nuevaEntradaSala(pA));

        TenantContext.setCurrentTenant(tenantB);
        assertThrows(RuntimeException.class, () -> salaEsperaService.llamarAConsultorio(entradaA.getId(), "Consultorio 1"));
        assertThrows(RuntimeException.class, () -> salaEsperaService.finalizarAtencion(entradaA.getId()));

        TenantContext.setCurrentTenant(tenantA);
        SalaEspera releida = salaEsperaService.listarColaActiva(tenantA).stream()
            .filter(e -> e.getId().equals(entradaA.getId())).findFirst().orElseThrow();
        assertEquals(SalaEspera.EstadoEspera.EN_ESPERA, releida.getEstado(), "La entrada de A no debe haber cambiado de estado");
    }

    private SalaEspera nuevaEntradaSala(Paciente paciente) {
        SalaEspera entrada = new SalaEspera();
        Paciente ref = new Paciente();
        ref.setId(paciente.getId());
        entrada.setPaciente(ref);
        return entrada;
    }

    // ── Agenda Médica ──────────────────────────────────────────────────────────────────────

    @Test
    void tenantBNoPuedeVerAgendaNiHistorialDeCitasDeA() {
        long tenantA = 97025L, tenantB = 97026L;
        Paciente pA = pacienteService.crear(tenantA, nuevoPaciente("V-13001", "Paciente Agenda A"));
        CitaMedica citaA = agendaMedicaService.agendarCita(tenantA, nuevaCita(pA, 601L));

        assertTrue(agendaMedicaService.listarPorFecha(tenantA, citaA.getFecha()).stream().anyMatch(c -> c.getId().equals(citaA.getId())));
        assertTrue(agendaMedicaService.listarPorFecha(tenantB, citaA.getFecha()).isEmpty());
        assertTrue(agendaMedicaService.listarPorMedicoYFecha(tenantB, 601L, citaA.getFecha()).isEmpty());
        assertTrue(agendaMedicaService.historialPorPaciente(tenantB, pA.getId()).isEmpty());
    }

    @Test
    void tenantBNoPuedeAgendarCitaConPacienteDeA() {
        long tenantA = 97027L, tenantB = 97028L;
        Paciente pA = pacienteService.crear(tenantA, nuevoPaciente("V-14001", "Paciente Agenda A"));

        assertThrows(RuntimeException.class, () -> agendaMedicaService.agendarCita(tenantB, nuevaCita(pA, 602L)));
    }

    @Test
    void tenantBNoPuedeModificarCitaNiBloqueoDeA() {
        long tenantA = 97029L, tenantB = 97030L;
        Paciente pA = pacienteService.crear(tenantA, nuevoPaciente("V-15001", "Paciente Agenda A"));
        CitaMedica citaA = agendaMedicaService.agendarCita(tenantA, nuevaCita(pA, 603L));
        BloqueoAgenda bloqueo = new BloqueoAgenda();
        bloqueo.setMedicoId(603L);
        bloqueo.setFechaInicio(LocalDate.of(2026, 10, 1));
        bloqueo.setFechaFin(LocalDate.of(2026, 10, 1));
        bloqueo.setMotivo("Reunión");
        bloqueo = agendaMedicaService.registrarBloqueo(tenantA, bloqueo);
        Long bloqueoId = bloqueo.getId();

        assertThrows(RuntimeException.class, () -> agendaMedicaService.actualizarEstado(tenantB, citaA.getId(), CitaMedica.EstadoCita.CANCELADA));
        assertThrows(RuntimeException.class, () -> agendaMedicaService.reprogramarCita(tenantB, citaA.getId(), LocalDate.of(2026, 10, 2), LocalTime.of(10, 0), LocalTime.of(10, 30)));
        assertThrows(RuntimeException.class, () -> agendaMedicaService.eliminarBloqueo(tenantB, bloqueoId));
    }

    private CitaMedica nuevaCita(Paciente paciente, Long medicoId) {
        CitaMedica cita = new CitaMedica();
        Paciente ref = new Paciente();
        ref.setId(paciente.getId());
        cita.setPaciente(ref);
        cita.setMedicoId(medicoId);
        cita.setFecha(LocalDate.of(2026, 10, 1));
        cita.setHoraInicio(LocalTime.of(9, 0));
        cita.setHoraFin(LocalTime.of(9, 30));
        return cita;
    }
}
