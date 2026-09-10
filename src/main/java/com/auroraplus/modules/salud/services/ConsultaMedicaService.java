package com.auroraplus.modules.salud.services;

import com.auroraplus.core.config.TenantContext;
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

    /**
     * HALLAZGO DE SEGURIDAD (confirmado con explotación real): findById() de
     * Hibernate NO respeta @Filter — a diferencia de findByXxx (consultas HQL,
     * sí filtradas automáticamente), una carga directa por clave primaria
     * (EntityManager.find) ignora el filtro de tenant aunque esté activo en
     * la sesión. Antes de este fix, CUALQUIER clínica autenticada podía leer
     * el diagnóstico completo de CUALQUIER paciente de CUALQUIER OTRA clínica
     * con solo cambiar el {id} en GET /api/salud/consultas/{id} — probado en
     * vivo durante la auditoría. La verificación explícita de tenantId acá es
     * la única protección real para esta ruta de acceso.
     */
    public Optional<ConsultaMedica> obtenerPorId(Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
        return consultaMedicaRepository.findById(id)
            .filter(c -> tenantId != null && tenantId.equals(c.getTenantId()));
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

        // Si la consulta viene de una cita, actualizar el estado de la cita a ATENDIDA.
        // citaId llega en el body del cliente — sin el chequeo de tenantId, una
        // clínica podría pasar el citaId de OTRA clínica y marcar su cita como
        // atendida (mismo hallazgo de findById() sin filtrar que en obtenerPorId).
        if (consulta.getCitaId() != null) {
            citaMedicaRepository.findById(consulta.getCitaId())
                .filter(cita -> tenantId.equals(cita.getTenantId()))
                .ifPresent(cita -> {
                    cita.setEstado(CitaMedica.EstadoCita.ATENDIDA);
                    citaMedicaRepository.save(cita);
                });
        }

        return guardada;
    }

    /** Mismo hallazgo que obtenerPorId(): sin este chequeo, cualquier tenant
     * podía borrar el historial clínico de otro con solo adivinar el id. */
    @Transactional
    public void eliminarConsulta(Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
        ConsultaMedica consulta = consultaMedicaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Consulta no encontrada con ID: " + id));
        if (tenantId == null || !tenantId.equals(consulta.getTenantId())) {
            throw new RuntimeException("Violación de seguridad: la consulta no pertenece a este tenant");
        }
        consultaMedicaRepository.delete(consulta);
    }
}
