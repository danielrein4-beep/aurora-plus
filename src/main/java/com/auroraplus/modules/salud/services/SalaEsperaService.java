package com.auroraplus.modules.salud.services;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.entities.CitaMedica;
import com.auroraplus.modules.salud.entities.SalaEspera;
import com.auroraplus.modules.salud.repositories.CitaMedicaRepository;
import com.auroraplus.modules.salud.repositories.PacienteRepository;
import com.auroraplus.modules.salud.repositories.SalaEsperaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class SalaEsperaService {

    @Autowired
    private SalaEsperaRepository salaEsperaRepository;

    @Autowired
    private CitaMedicaRepository citaMedicaRepository;

    @Autowired
    private PacienteRepository pacienteRepository;

    /**
     * Hardening piloto P0: antes no filtraba por tenant en absoluto — la cola de espera en
     * tiempo real (con nombres de pacientes) mezclaba TODAS las clínicas del sistema.
     */
    public List<SalaEspera> listarColaActiva(Long tenantId) {
        exigirTenant(tenantId);
        return salaEsperaRepository.findByTenantIdAndEstadoInOrderByHoraLlegadaAsc(
            tenantId, List.of(SalaEspera.EstadoEspera.EN_ESPERA, SalaEspera.EstadoEspera.EN_CONSULTA)
        );
    }

    @Transactional
    public SalaEspera checkIn(Long tenantId, SalaEspera entrada) {
        exigirTenant(tenantId);
        if (entrada.getPaciente() == null || entrada.getPaciente().getId() == null) {
            throw new IllegalArgumentException("El check-in debe estar asociado a un paciente.");
        }
        // Hardening piloto P0: antes no se validaba que el paciente referenciado perteneciera a
        // este tenant — una clínica podía hacer check-in de un paciente de OTRA clínica.
        pacienteRepository.findByTenantIdAndId(tenantId, entrada.getPaciente().getId())
            .orElseThrow(() -> new RuntimeException("Paciente no encontrado (o no pertenece a este tenant)"));
        entrada.setTenantId(tenantId);
        entrada.setHoraLlegada(LocalDateTime.now());
        entrada.setEstado(SalaEspera.EstadoEspera.EN_ESPERA);

        SalaEspera guardada = salaEsperaRepository.save(entrada);

        if (entrada.getCitaId() != null) {
            citaMedicaRepository.findById(entrada.getCitaId())
                .filter(c -> tenantId.equals(c.getTenantId()))
                .ifPresent(c -> {
                    c.setEstado(CitaMedica.EstadoCita.EN_SALA);
                    citaMedicaRepository.save(c);
                });
        }

        return guardada;
    }

    @Transactional
    public SalaEspera llamarAConsultorio(Long id, String consultorio) {
        return llamarAConsultorio(id, consultorio, null, null);
    }

    /** findById() no respeta el filtro de tenant (ver hallazgo en ConsultaMedicaService) —
     * sin esta verificación, cualquier clínica podía tocar la cola de sala de espera de OTRA. */
    private SalaEspera obtenerEntradaPropia(Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
        SalaEspera entrada = salaEsperaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Entrada de sala no encontrada con ID: " + id));
        if (tenantId == null || !tenantId.equals(entrada.getTenantId())) {
            throw new RuntimeException("Violación de seguridad: la entrada de sala no pertenece a este tenant");
        }
        return entrada;
    }

    /**
     * medicoId/medicoNombre opcionales: para un walk-in sin cita previa, es
     * en ESTE momento (no en el check-in) cuando recepción sabe a qué médico
     * mandarlo — antes esto no se podía asignar nunca, porque medicoId era
     * obligatorio desde el check-in.
     */
    @Transactional
    public SalaEspera llamarAConsultorio(Long id, String consultorio, Long medicoId, String medicoNombre) {
        SalaEspera entrada = obtenerEntradaPropia(id);
        Long tenantId = entrada.getTenantId();

        entrada.setEstado(SalaEspera.EstadoEspera.EN_CONSULTA);
        entrada.setHoraLlamado(LocalDateTime.now());
        if (consultorio != null) entrada.setConsultorio(consultorio);
        if (medicoId != null) entrada.setMedicoId(medicoId);
        if (medicoNombre != null) entrada.setMedicoNombre(medicoNombre);

        if (entrada.getCitaId() != null) {
            citaMedicaRepository.findById(entrada.getCitaId())
                .filter(c -> tenantId.equals(c.getTenantId()))
                .ifPresent(c -> {
                    c.setEstado(CitaMedica.EstadoCita.EN_CONSULTA);
                    citaMedicaRepository.save(c);
                });
        }

        return salaEsperaRepository.save(entrada);
    }

    @Transactional
    public SalaEspera finalizarAtencion(Long id) {
        SalaEspera entrada = obtenerEntradaPropia(id);

        entrada.setEstado(SalaEspera.EstadoEspera.ATENDIDO);
        entrada.setHoraFinalizacion(LocalDateTime.now());

        return salaEsperaRepository.save(entrada);
    }

    private void exigirTenant(Long tenantId) {
        if (tenantId == null) {
            throw new RuntimeException("Tenant no identificado en la sesión");
        }
    }
}
