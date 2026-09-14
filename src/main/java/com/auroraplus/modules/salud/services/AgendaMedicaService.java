package com.auroraplus.modules.salud.services;

import com.auroraplus.modules.salud.entities.BloqueoAgenda;
import com.auroraplus.modules.salud.entities.CitaMedica;
import com.auroraplus.modules.salud.repositories.BloqueoAgendaRepository;
import com.auroraplus.modules.salud.repositories.CitaMedicaRepository;
import com.auroraplus.modules.salud.repositories.PacienteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
public class AgendaMedicaService {

    @Autowired
    private CitaMedicaRepository citaMedicaRepository;

    @Autowired
    private BloqueoAgendaRepository bloqueoAgendaRepository;

    @Autowired
    private PacienteRepository pacienteRepository;

    public List<CitaMedica> listarPorFecha(Long tenantId, LocalDate fecha) {
        exigirTenant(tenantId);
        return citaMedicaRepository.findByTenantIdAndFecha(tenantId, fecha);
    }

    public List<CitaMedica> listarPorMedicoYFecha(Long tenantId, Long medicoId, LocalDate fecha) {
        exigirTenant(tenantId);
        return citaMedicaRepository.findByTenantIdAndMedicoIdAndFecha(tenantId, medicoId, fecha);
    }

    public List<CitaMedica> listarPorRango(Long tenantId, LocalDate inicio, LocalDate fin) {
        exigirTenant(tenantId);
        return citaMedicaRepository.findByTenantIdAndFechaBetween(tenantId, inicio, fin);
    }

    public List<CitaMedica> historialPorPaciente(Long tenantId, Long pacienteId) {
        exigirTenant(tenantId);
        return citaMedicaRepository.findByTenantIdAndPacienteIdOrderByFechaDescHoraInicioDesc(tenantId, pacienteId);
    }

    @Transactional
    public CitaMedica agendarCita(Long tenantId, CitaMedica cita) {
        exigirTenant(tenantId);
        if (cita.getPaciente() == null || cita.getPaciente().getId() == null) {
            throw new IllegalArgumentException("La cita debe estar asociada a un paciente.");
        }
        pacienteRepository.findByTenantIdAndId(tenantId, cita.getPaciente().getId())
            .orElseThrow(() -> new RuntimeException("Paciente no encontrado (o no pertenece a este tenant)"));
        validarDisponibilidad(tenantId, cita.getMedicoId(), cita.getFecha(), cita.getHoraInicio(), cita.getHoraFin(), null);
        cita.setId(null);
        cita.setTenantId(tenantId);
        if (cita.getEstado() == null) {
            cita.setEstado(CitaMedica.EstadoCita.PROGRAMADA);
        }
        return citaMedicaRepository.save(cita);
    }

    /** findById() no respeta el filtro de tenant (ver hallazgo en ConsultaMedicaService) —
     * sin esta verificación, cualquier clínica podía cambiar el estado de la cita de OTRA. */
    private CitaMedica obtenerCitaPropia(Long tenantId, Long citaId) {
        exigirTenant(tenantId);
        return citaMedicaRepository.findByTenantIdAndId(tenantId, citaId)
            .orElseThrow(() -> new RuntimeException("Cita no encontrada (o no pertenece a este tenant)"));
    }

    @Transactional
    public CitaMedica actualizarEstado(Long tenantId, Long citaId, CitaMedica.EstadoCita nuevoEstado) {
        CitaMedica cita = obtenerCitaPropia(tenantId, citaId);
        cita.setEstado(nuevoEstado);
        return citaMedicaRepository.save(cita);
    }

    /** Mueve una cita a otra fecha/hora — misma validación de disponibilidad que agendar una nueva,
     * excluyendo la propia cita del chequeo de solapamiento (si no, siempre "chocaría" consigo misma). */
    @Transactional
    public CitaMedica reprogramarCita(Long tenantId, Long citaId, LocalDate fecha, LocalTime horaInicio, LocalTime horaFin) {
        CitaMedica cita = obtenerCitaPropia(tenantId, citaId);
        validarDisponibilidad(tenantId, cita.getMedicoId(), fecha, horaInicio, horaFin, citaId);
        cita.setFecha(fecha);
        cita.setHoraInicio(horaInicio);
        cita.setHoraFin(horaFin);
        return citaMedicaRepository.save(cita);
    }

    @Transactional
    public BloqueoAgenda registrarBloqueo(Long tenantId, BloqueoAgenda bloqueo) {
        exigirTenant(tenantId);
        bloqueo.setId(null);
        bloqueo.setTenantId(tenantId);
        return bloqueoAgendaRepository.save(bloqueo);
    }

    public List<BloqueoAgenda> listarBloqueosPorMedico(Long tenantId, Long medicoId) {
        exigirTenant(tenantId);
        return bloqueoAgendaRepository.findByTenantIdAndMedicoId(tenantId, medicoId);
    }

    @Transactional
    public void eliminarBloqueo(Long tenantId, Long id) {
        exigirTenant(tenantId);
        BloqueoAgenda bloqueo = bloqueoAgendaRepository.findByTenantIdAndId(tenantId, id)
            .orElseThrow(() -> new RuntimeException("Bloqueo no encontrado (o no pertenece a este tenant)"));
        bloqueoAgendaRepository.delete(bloqueo);
    }

    private void validarDisponibilidad(Long tenantId, Long medicoId, LocalDate fecha, LocalTime inicio, LocalTime fin, Long citaExcluidaId) {
        // 1. Validar bloqueos
        List<BloqueoAgenda> bloqueos = bloqueoAgendaRepository.buscarBloqueosEnFecha(tenantId, medicoId, fecha);
        for (BloqueoAgenda b : bloqueos) {
            if (b.getHoraInicio() == null || b.getHoraFin() == null) {
                throw new IllegalStateException("El médico tiene un bloqueo de jornada completa para esta fecha: " + b.getMotivo());
            }
            if (inicio.isBefore(b.getHoraFin()) && fin.isAfter(b.getHoraInicio())) {
                throw new IllegalStateException("Horario bloqueado por el médico: " + b.getMotivo());
            }
        }

        // 2. Validar solapamiento con otras citas
        List<CitaMedica> solapadas = citaMedicaRepository.buscarSolapamientos(tenantId, medicoId, fecha, inicio, fin);
        for (CitaMedica c : solapadas) {
            if (citaExcluidaId == null || !c.getId().equals(citaExcluidaId)) {
                throw new IllegalStateException("Ya existe una cita agendada para este médico entre " +
                        c.getHoraInicio() + " y " + c.getHoraFin());
            }
        }
    }

    private void exigirTenant(Long tenantId) {
        if (tenantId == null) {
            throw new RuntimeException("Tenant no identificado en la sesión");
        }
    }
}
