package com.auroraplus.modules.salud.services;

import com.auroraplus.modules.salud.entities.BloqueoAgenda;
import com.auroraplus.modules.salud.entities.CitaMedica;
import com.auroraplus.modules.salud.repositories.BloqueoAgendaRepository;
import com.auroraplus.modules.salud.repositories.CitaMedicaRepository;
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

    public List<CitaMedica> listarPorFecha(LocalDate fecha) {
        return citaMedicaRepository.findByFecha(fecha);
    }

    public List<CitaMedica> listarPorMedicoYFecha(Long medicoId, LocalDate fecha) {
        return citaMedicaRepository.findByMedicoIdAndFecha(medicoId, fecha);
    }

    public List<CitaMedica> listarPorRango(LocalDate inicio, LocalDate fin) {
        return citaMedicaRepository.findByFechaBetween(inicio, fin);
    }

    public List<CitaMedica> historialPorPaciente(Long pacienteId) {
        return citaMedicaRepository.findByPacienteIdOrderByFechaDescHoraInicioDesc(pacienteId);
    }

    @Transactional
    public CitaMedica agendarCita(Long tenantId, CitaMedica cita) {
        validarDisponibilidad(cita.getMedicoId(), cita.getFecha(), cita.getHoraInicio(), cita.getHoraFin(), null);
        cita.setTenantId(tenantId);
        if (cita.getEstado() == null) {
            cita.setEstado(CitaMedica.EstadoCita.PROGRAMADA);
        }
        return citaMedicaRepository.save(cita);
    }

    @Transactional
    public CitaMedica actualizarEstado(Long citaId, CitaMedica.EstadoCita nuevoEstado) {
        CitaMedica cita = citaMedicaRepository.findById(citaId)
            .orElseThrow(() -> new RuntimeException("Cita no encontrada con ID: " + citaId));
        cita.setEstado(nuevoEstado);
        return citaMedicaRepository.save(cita);
    }

    @Transactional
    public BloqueoAgenda registrarBloqueo(Long tenantId, BloqueoAgenda bloqueo) {
        bloqueo.setTenantId(tenantId);
        return bloqueoAgendaRepository.save(bloqueo);
    }

    public List<BloqueoAgenda> listarBloqueosPorMedico(Long medicoId) {
        return bloqueoAgendaRepository.findByMedicoId(medicoId);
    }

    private void validarDisponibilidad(Long medicoId, LocalDate fecha, LocalTime inicio, LocalTime fin, Long citaExcluidaId) {
        // 1. Validar bloqueos
        List<BloqueoAgenda> bloqueos = bloqueoAgendaRepository.buscarBloqueosEnFecha(medicoId, fecha);
        for (BloqueoAgenda b : bloqueos) {
            if (b.getHoraInicio() == null || b.getHoraFin() == null) {
                throw new IllegalStateException("El médico tiene un bloqueo de jornada completa para esta fecha: " + b.getMotivo());
            }
            if (inicio.isBefore(b.getHoraFin()) && fin.isAfter(b.getHoraInicio())) {
                throw new IllegalStateException("Horario bloqueado por el médico: " + b.getMotivo());
            }
        }

        // 2. Validar solapamiento con otras citas
        List<CitaMedica> solapadas = citaMedicaRepository.buscarSolapamientos(medicoId, fecha, inicio, fin);
        for (CitaMedica c : solapadas) {
            if (citaExcluidaId == null || !c.getId().equals(citaExcluidaId)) {
                throw new IllegalStateException("Ya existe una cita agendada para este médico entre " +
                        c.getHoraInicio() + " y " + c.getHoraFin());
            }
        }
    }
}
