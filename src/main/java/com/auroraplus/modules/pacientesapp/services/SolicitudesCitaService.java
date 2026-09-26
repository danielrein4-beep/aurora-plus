package com.auroraplus.modules.pacientesapp.services;

import com.auroraplus.modules.pacientesapp.entities.PacienteApp;
import com.auroraplus.modules.pacientesapp.entities.PerfilConsultorio;
import com.auroraplus.modules.pacientesapp.entities.SolicitudCitaApp;
import com.auroraplus.modules.pacientesapp.entities.VinculoPacienteApp;
import com.auroraplus.modules.pacientesapp.repositories.PacienteAppRepository;
import com.auroraplus.modules.pacientesapp.repositories.PerfilConsultorioRepository;
import com.auroraplus.modules.pacientesapp.repositories.SolicitudCitaAppRepository;
import com.auroraplus.modules.pacientesapp.repositories.VinculoPacienteAppRepository;
import com.auroraplus.modules.salud.entities.CitaMedica;
import com.auroraplus.modules.salud.entities.Paciente;
import com.auroraplus.modules.salud.repositories.CitaMedicaRepository;
import com.auroraplus.modules.salud.repositories.PacienteRepository;
import com.auroraplus.modules.salud.services.AgendaMedicaService;
import com.auroraplus.modules.salud.services.MedicoTenantResolver;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.List;

/**
 * Solicitudes de cita de la app y su paso a la agenda de Mediclinic.
 * La solicitud nunca toca salud_citas hasta que la clínica la acepta (o el consultorio
 * tiene confirmación automática); al aceptarla se usa AgendaMedicaService.agendarCita,
 * con la misma validación de choques y bloqueos que una cita hecha en recepción.
 */
@Service
public class SolicitudesCitaService {

    private static final int MAX_PENDIENTES_POR_PACIENTE = 3;

    @Autowired private SolicitudCitaAppRepository solicitudes;
    @Autowired private PacienteAppRepository pacientesApp;
    @Autowired private PerfilConsultorioRepository perfiles;
    @Autowired private VinculoPacienteAppRepository vinculos;
    @Autowired private DirectorioService directorio;
    @Autowired private PacienteRepository pacientesSalud;
    @Autowired private CitaMedicaRepository citas;
    @Autowired private AgendaMedicaService agenda;
    @Autowired private MedicoTenantResolver medicoResolver;

    /** Lo que ve el paciente en "Mis citas". `medicoId` es el tenant del consultorio. */
    public record CitaPacienteDto(Long id, Long medicoId, String fecha, String estado, String motivo, String respuesta) {}

    /** Lo que ve la recepción en Mediclinic. */
    public record SolicitudClinicaDto(Long id, String paciente, String cedula, String telefono, String fecha, String horaInicio,
                                      String horaFin, String motivo, String estado, Long citaId, String respuesta, String creadoEn) {}

    // ---------- Lado del paciente ----------

    @Transactional
    public CitaPacienteDto solicitar(Long pacienteAppId, Long tenantId, LocalDate fecha, String hora, String motivo) {
        PacienteApp paciente = pacientesApp.findById(pacienteAppId).orElseThrow(() -> new RuntimeException("Cuenta no encontrada"));
        PerfilConsultorio perfil = directorio.perfilPublicado(tenantId);
        if (solicitudes.countByPacienteIdAndEstado(pacienteAppId, SolicitudCitaApp.Estado.SOLICITADA) >= MAX_PENDIENTES_POR_PACIENTE) {
            throw new RuntimeException("Ya tienes " + MAX_PENDIENTES_POR_PACIENTE + " solicitudes esperando respuesta. Espera a que te confirmen");
        }
        boolean libre = directorio.horariosDe(perfil, fecha).stream().anyMatch(h -> h.hora().equals(hora) && h.libre());
        if (!libre) throw new RuntimeException("Esa hora ya no está disponible. Elige otra");

        LocalTime inicio = LocalTime.parse(hora);
        SolicitudCitaApp s = new SolicitudCitaApp();
        s.setTenantId(tenantId);
        s.setPaciente(paciente);
        s.setFecha(fecha);
        s.setHoraInicio(inicio);
        s.setHoraFin(inicio.plusMinutes(Math.max(10, perfil.getDuracionMinutos())));
        s.setMotivo(motivo == null || motivo.isBlank() ? null : motivo.trim().substring(0, Math.min(200, motivo.trim().length())));
        try {
            s = solicitudes.saveAndFlush(s);
        } catch (DataIntegrityViolationException e) {
            throw new RuntimeException("Alguien acaba de pedir esa hora. Elige otra");
        }
        if (perfil.isConfirmacionAutomatica()) {
            convertirEnCita(s, "Confirmación automática");
        }
        return aDtoPaciente(s);
    }

    public List<CitaPacienteDto> misCitas(Long pacienteAppId) {
        return solicitudes.findByPacienteIdOrderByFechaDescHoraInicioDesc(pacienteAppId).stream().map(this::aDtoPaciente).toList();
    }

    @Transactional
    public CitaPacienteDto cancelarPorPaciente(Long pacienteAppId, Long solicitudId) {
        SolicitudCitaApp s = solicitudes.findByIdAndPacienteId(solicitudId, pacienteAppId)
            .orElseThrow(() -> new RuntimeException("Cita no encontrada"));
        if (s.getEstado() == SolicitudCitaApp.Estado.ACEPTADA && s.getCitaId() != null) {
            CitaMedica cita = citas.findByTenantIdAndId(s.getTenantId(), s.getCitaId()).orElse(null);
            if (cita != null && EnumSet.of(CitaMedica.EstadoCita.PROGRAMADA, CitaMedica.EstadoCita.CONFIRMADA).contains(cita.getEstado())) {
                agenda.actualizarEstado(s.getTenantId(), cita.getId(), CitaMedica.EstadoCita.CANCELADA);
            } else if (cita != null) {
                throw new RuntimeException("Esta cita ya no se puede cancelar desde la app");
            }
        } else if (s.getEstado() != SolicitudCitaApp.Estado.SOLICITADA) {
            throw new RuntimeException("Esta cita ya no se puede cancelar");
        }
        s.setEstado(SolicitudCitaApp.Estado.CANCELADA);
        s.setRespuesta("Cancelada por el paciente");
        s.setRespondidoEn(LocalDateTime.now());
        return aDtoPaciente(solicitudes.save(s));
    }

    // ---------- Lado de la clínica (Mediclinic) ----------

    public List<SolicitudClinicaDto> bandeja(Long tenantId) {
        return solicitudes.findByTenantIdAndEstadoInOrderByFechaAscHoraInicioAsc(tenantId,
                EnumSet.allOf(SolicitudCitaApp.Estado.class)).stream()
            .filter(s -> s.getEstado() == SolicitudCitaApp.Estado.SOLICITADA || !s.getFecha().isBefore(LocalDate.now().minusDays(7)))
            .map(this::aDtoClinica).toList();
    }

    @Transactional
    public SolicitudClinicaDto aceptar(Long tenantId, Long solicitudId, String usuario) {
        SolicitudCitaApp s = pendienteDe(tenantId, solicitudId);
        convertirEnCita(s, usuario);
        return aDtoClinica(s);
    }

    @Transactional
    public SolicitudClinicaDto rechazar(Long tenantId, Long solicitudId, String motivo, String usuario) {
        SolicitudCitaApp s = pendienteDe(tenantId, solicitudId);
        s.setEstado(SolicitudCitaApp.Estado.RECHAZADA);
        s.setRespuesta(motivo == null || motivo.isBlank() ? "El consultorio no puede atenderte a esa hora" : motivo.trim());
        s.setRespondidoPor(usuario);
        s.setRespondidoEn(LocalDateTime.now());
        return aDtoClinica(solicitudes.save(s));
    }

    private SolicitudCitaApp pendienteDe(Long tenantId, Long solicitudId) {
        SolicitudCitaApp s = solicitudes.findByIdAndTenantId(solicitudId, tenantId)
            .orElseThrow(() -> new RuntimeException("Solicitud no encontrada"));
        if (s.getEstado() != SolicitudCitaApp.Estado.SOLICITADA) throw new RuntimeException("Esta solicitud ya fue respondida");
        return s;
    }

    /** Crea (o reutiliza) la ficha del paciente en el consultorio y agenda la cita real. */
    private void convertirEnCita(SolicitudCitaApp s, String usuario) {
        Long tenantId = s.getTenantId();
        Paciente ficha = fichaEnConsultorio(tenantId, s.getPaciente());
        var medico = medicoResolver.resolverMedicoDelTenant(tenantId)
            .orElseThrow(() -> new RuntimeException("El consultorio no tiene un médico configurado"));
        PerfilConsultorio perfil = perfiles.findById(tenantId).orElse(null);

        CitaMedica cita = new CitaMedica();
        cita.setPaciente(ficha);
        cita.setMedicoId(medico.id);
        cita.setMedicoNombre(medico.nombre);
        cita.setFecha(s.getFecha());
        cita.setHoraInicio(s.getHoraInicio());
        cita.setHoraFin(s.getHoraFin());
        cita.setMotivo(s.getMotivo() != null ? s.getMotivo() : "Consulta pedida desde la app");
        cita.setEspecialidad(perfil != null ? DirectorioService.ESPECIALIDADES.getOrDefault(perfil.getEspecialidad(), null) : null);
        cita.setCostoEstimado(perfil != null ? perfil.getPrecioConsulta() : null);
        cita.setNotas("Pedida desde Mediclinic Pacientes");
        cita.setEstado(CitaMedica.EstadoCita.CONFIRMADA);
        CitaMedica creada = agenda.agendarCita(tenantId, cita);

        s.setEstado(SolicitudCitaApp.Estado.ACEPTADA);
        s.setCitaId(creada.getId());
        s.setRespondidoPor(usuario);
        s.setRespondidoEn(LocalDateTime.now());
        solicitudes.save(s);
    }

    private Paciente fichaEnConsultorio(Long tenantId, PacienteApp p) {
        VinculoPacienteApp v = vinculos.findByPacienteAppIdAndTenantId(p.getId(), tenantId).orElse(null);
        if (v != null) {
            Paciente existente = pacientesSalud.findByTenantIdAndId(tenantId, v.getPacienteId()).orElse(null);
            if (existente != null) return existente;
        }
        String digitos = Cedula.digitos(p.getCedula());
        Paciente ficha = pacientesSalud.findByTenantIdAndActivoTrue(tenantId).stream()
            .filter(x -> digitos.equals(Cedula.digitos(x.getIdentificacion())))
            .findFirst()
            .orElseGet(() -> {
                Paciente nuevo = new Paciente();
                nuevo.setTenantId(tenantId);
                nuevo.setIdentificacion(Cedula.conGuion(p.getCedula()));
                String[] partes = p.getNombre().trim().split("\\s+", 2);
                nuevo.setNombres(partes[0]);
                nuevo.setApellidos(partes.length > 1 ? partes[1] : "-");
                nuevo.setTelefono(p.getTelefono());
                nuevo.setActivo(true);
                return pacientesSalud.save(nuevo);
            });
        if (v == null) {
            v = new VinculoPacienteApp();
            v.setPacienteAppId(p.getId());
            v.setTenantId(tenantId);
        }
        v.setPacienteId(ficha.getId());
        vinculos.save(v);
        return ficha;
    }

    private CitaPacienteDto aDtoPaciente(SolicitudCitaApp s) {
        String estado = switch (s.getEstado()) {
            case SOLICITADA -> "SOLICITADA";
            case RECHAZADA, CANCELADA -> "CANCELADA";
            case ACEPTADA -> {
                CitaMedica cita = s.getCitaId() == null ? null : citas.findByTenantIdAndId(s.getTenantId(), s.getCitaId()).orElse(null);
                if (cita == null) yield "CONFIRMADA";
                yield switch (cita.getEstado()) {
                    case ATENDIDA -> "ATENDIDA";
                    case CANCELADA, NO_ASISTIO -> "CANCELADA";
                    default -> "CONFIRMADA";
                };
            }
        };
        String fecha = s.getFecha() + "T" + String.format("%02d:%02d", s.getHoraInicio().getHour(), s.getHoraInicio().getMinute());
        return new CitaPacienteDto(s.getId(), s.getTenantId(), fecha, estado, s.getMotivo(), s.getRespuesta());
    }

    private SolicitudClinicaDto aDtoClinica(SolicitudCitaApp s) {
        PacienteApp p = s.getPaciente();
        return new SolicitudClinicaDto(s.getId(), p.getNombre(), Cedula.conGuion(p.getCedula()), p.getTelefono(),
            s.getFecha().toString(), s.getHoraInicio().toString(), s.getHoraFin().toString(), s.getMotivo(),
            s.getEstado().name(), s.getCitaId(), s.getRespuesta(), s.getCreadoEn().toString());
    }
}
