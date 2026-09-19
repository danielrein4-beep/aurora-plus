package com.auroraplus.modules.veterinaria.services;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.veterinaria.entities.BloqueoAgendaVet;
import com.auroraplus.modules.veterinaria.entities.CitaVeterinaria;
import com.auroraplus.modules.veterinaria.repositories.BloqueoAgendaVetRepository;
import com.auroraplus.modules.veterinaria.repositories.CitaVeterinariaRepository;
import com.auroraplus.modules.veterinaria.repositories.MascotaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
public class AgendaVeterinariaService {

    @Autowired
    private CitaVeterinariaRepository citaVeterinariaRepository;

    @Autowired
    private BloqueoAgendaVetRepository bloqueoAgendaVetRepository;

    @Autowired
    private MascotaRepository mascotaRepository;

    public List<CitaVeterinaria> listarPorFecha(LocalDate fecha) {
        return citaVeterinariaRepository.findByFecha(fecha);
    }

    public List<CitaVeterinaria> listarPorVeterinarioYFecha(Long veterinarioId, LocalDate fecha) {
        return citaVeterinariaRepository.findByVeterinarioIdAndFecha(veterinarioId, fecha);
    }

    public List<CitaVeterinaria> listarPorRango(LocalDate fechaInicio, LocalDate fechaFin) {
        return citaVeterinariaRepository.findByFechaBetweenOrderByFechaAscHoraInicioAsc(fechaInicio, fechaFin);
    }

    public List<CitaVeterinaria> historialPorMascota(Long mascotaId) {
        return citaVeterinariaRepository.findByMascotaId(mascotaId);
    }

    @Transactional
    public CitaVeterinaria agendarCita(Long tenantId, CitaVeterinaria cita) {
        if (cita.getMascota() == null || cita.getMascota().getId() == null) {
            throw new IllegalArgumentException("La cita debe estar asociada a una mascota.");
        }
        if (cita.getFecha() == null || cita.getHoraInicio() == null || cita.getHoraFin() == null) {
            throw new IllegalArgumentException("La fecha, hora de inicio y hora de fin son obligatorias.");
        }
        if (cita.getHoraFin().isBefore(cita.getHoraInicio()) || cita.getHoraFin().equals(cita.getHoraInicio())) {
            throw new IllegalArgumentException("La hora de fin debe ser posterior a la hora de inicio.");
        }

        // Validar que la mascota pertenezca al tenant
        mascotaRepository.findByTenantIdAndId(tenantId, cita.getMascota().getId())
            .orElseThrow(() -> new IllegalArgumentException("La mascota no pertenece a este tenant."));

        validarDisponibilidad(cita.getVeterinarioId(), cita.getFecha(), cita.getHoraInicio(), cita.getHoraFin(), null);

        cita.setTenantId(tenantId);
        return citaVeterinariaRepository.save(cita);
    }

    private CitaVeterinaria obtenerCitaPropia(Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
        CitaVeterinaria cita = citaVeterinariaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Cita veterinaria no encontrada con ID: " + id));
        if (tenantId == null || !tenantId.equals(cita.getTenantId())) {
            throw new RuntimeException("Violación de seguridad: la cita no pertenece a este tenant");
        }
        return cita;
    }

    @Transactional
    public CitaVeterinaria actualizarEstado(Long citaId, CitaVeterinaria.EstadoCita nuevoEstado) {
        CitaVeterinaria cita = obtenerCitaPropia(citaId);
        cita.setEstado(nuevoEstado);
        return citaVeterinariaRepository.save(cita);
    }

    @Transactional
    public CitaVeterinaria reprogramarCita(Long citaId, LocalDate fecha, LocalTime horaInicio, LocalTime horaFin) {
        CitaVeterinaria cita = obtenerCitaPropia(citaId);
        validarDisponibilidad(cita.getVeterinarioId(), fecha, horaInicio, horaFin, citaId);
        cita.setFecha(fecha);
        cita.setHoraInicio(horaInicio);
        cita.setHoraFin(horaFin);
        return citaVeterinariaRepository.save(cita);
    }

    @Transactional
    public BloqueoAgendaVet registrarBloqueo(Long tenantId, BloqueoAgendaVet bloqueo) {
        bloqueo.setTenantId(tenantId);
        return bloqueoAgendaVetRepository.save(bloqueo);
    }

    public List<BloqueoAgendaVet> listarBloqueosPorVeterinario(Long veterinarioId) {
        return bloqueoAgendaVetRepository.findByVeterinarioId(veterinarioId);
    }

    @Transactional
    public void eliminarBloqueo(Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
        BloqueoAgendaVet bloqueo = bloqueoAgendaVetRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Bloqueo no encontrado con ID: " + id));
        if (tenantId == null || !tenantId.equals(bloqueo.getTenantId())) {
            throw new RuntimeException("Violación de seguridad: el bloqueo no pertenece a este tenant");
        }
        bloqueoAgendaVetRepository.delete(bloqueo);
    }

    private void validarDisponibilidad(Long veterinarioId, LocalDate fecha, LocalTime inicio, LocalTime fin, Long citaExcluidaId) {
        if (veterinarioId == null) return;

        // 1. Validar bloqueos
        List<BloqueoAgendaVet> bloqueos = bloqueoAgendaVetRepository.buscarBloqueosEnFecha(veterinarioId, fecha);
        for (BloqueoAgendaVet b : bloqueos) {
            if (b.getHoraInicio() == null || b.getHoraFin() == null) {
                throw new IllegalStateException("El veterinario tiene un bloqueo de jornada completa para esta fecha: " + b.getMotivo());
            }
            if (inicio.isBefore(b.getHoraFin()) && fin.isAfter(b.getHoraInicio())) {
                throw new IllegalStateException("Horario bloqueado por el veterinario: " + b.getMotivo());
            }
        }

        // 2. Validar solapamiento con otras citas
        List<CitaVeterinaria> solapadas = citaVeterinariaRepository.buscarSolapamientos(veterinarioId, fecha, inicio, fin);
        for (CitaVeterinaria c : solapadas) {
            if (citaExcluidaId == null || !c.getId().equals(citaExcluidaId)) {
                throw new IllegalStateException("Ya existe una cita agendada para este veterinario entre " +
                        c.getHoraInicio() + " y " + c.getHoraFin());
            }
        }
    }
}
