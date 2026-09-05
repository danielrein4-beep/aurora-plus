package com.auroraplus.modules.salud.services;

import com.auroraplus.modules.salud.entities.CitaMedica;
import com.auroraplus.modules.salud.entities.ConsultaMedica;
import com.auroraplus.modules.salud.repositories.CitaMedicaRepository;
import com.auroraplus.modules.salud.repositories.ConsultaMedicaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ConsultaMedicaService {

    @Autowired
    private ConsultaMedicaRepository consultaMedicaRepository;

    @Autowired
    private CitaMedicaRepository citaMedicaRepository;

    public List<ConsultaMedica> historialPorPaciente(Long pacienteId) {
        return consultaMedicaRepository.findByPacienteIdOrderByFechaHoraDesc(pacienteId);
    }

    public List<ConsultaMedica> listarPorMedico(Long medicoId) {
        return consultaMedicaRepository.findByMedicoIdOrderByFechaHoraDesc(medicoId);
    }

    public Optional<ConsultaMedica> obtenerPorId(Long id) {
        return consultaMedicaRepository.findById(id);
    }

    @Transactional
    public ConsultaMedica registrarConsulta(Long tenantId, ConsultaMedica consulta) {
        if (consulta.getPaciente() == null || consulta.getPaciente().getId() == null) {
            throw new IllegalArgumentException("La consulta médica debe estar asociada a un paciente.");
        }
        if (consulta.getMotivoConsulta() == null || consulta.getMotivoConsulta().isBlank()) {
            throw new IllegalArgumentException("El motivo de consulta es obligatorio.");
        }

        consulta.setTenantId(tenantId);
        consulta.calcularImc();
        ConsultaMedica guardada = consultaMedicaRepository.save(consulta);

        // Si la consulta viene de una cita, actualizar el estado de la cita a ATENDIDA
        if (consulta.getCitaId() != null) {
            citaMedicaRepository.findById(consulta.getCitaId()).ifPresent(cita -> {
                cita.setEstado(CitaMedica.EstadoCita.ATENDIDA);
                citaMedicaRepository.save(cita);
            });
        }

        return guardada;
    }
}
