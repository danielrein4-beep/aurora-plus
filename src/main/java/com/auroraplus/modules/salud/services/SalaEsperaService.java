package com.auroraplus.modules.salud.services;

import com.auroraplus.modules.salud.entities.CitaMedica;
import com.auroraplus.modules.salud.entities.SalaEspera;
import com.auroraplus.modules.salud.repositories.CitaMedicaRepository;
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

    public List<SalaEspera> listarColaActiva() {
        return salaEsperaRepository.findByEstadoInOrderByHoraLlegadaAsc(
            List.of(SalaEspera.EstadoEspera.EN_ESPERA, SalaEspera.EstadoEspera.EN_CONSULTA)
        );
    }

    @Transactional
    public SalaEspera checkIn(Long tenantId, SalaEspera entrada) {
        entrada.setTenantId(tenantId);
        entrada.setHoraLlegada(LocalDateTime.now());
        entrada.setEstado(SalaEspera.EstadoEspera.EN_ESPERA);

        SalaEspera guardada = salaEsperaRepository.save(entrada);

        if (entrada.getCitaId() != null) {
            citaMedicaRepository.findById(entrada.getCitaId()).ifPresent(c -> {
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

    /**
     * medicoId/medicoNombre opcionales: para un walk-in sin cita previa, es
     * en ESTE momento (no en el check-in) cuando recepción sabe a qué médico
     * mandarlo — antes esto no se podía asignar nunca, porque medicoId era
     * obligatorio desde el check-in.
     */
    @Transactional
    public SalaEspera llamarAConsultorio(Long id, String consultorio, Long medicoId, String medicoNombre) {
        SalaEspera entrada = salaEsperaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Entrada de sala no encontrada con ID: " + id));

        entrada.setEstado(SalaEspera.EstadoEspera.EN_CONSULTA);
        entrada.setHoraLlamado(LocalDateTime.now());
        if (consultorio != null) entrada.setConsultorio(consultorio);
        if (medicoId != null) entrada.setMedicoId(medicoId);
        if (medicoNombre != null) entrada.setMedicoNombre(medicoNombre);

        if (entrada.getCitaId() != null) {
            citaMedicaRepository.findById(entrada.getCitaId()).ifPresent(c -> {
                c.setEstado(CitaMedica.EstadoCita.EN_CONSULTA);
                citaMedicaRepository.save(c);
            });
        }

        return salaEsperaRepository.save(entrada);
    }

    @Transactional
    public SalaEspera finalizarAtencion(Long id) {
        SalaEspera entrada = salaEsperaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Entrada de sala no encontrada con ID: " + id));

        entrada.setEstado(SalaEspera.EstadoEspera.ATENDIDO);
        entrada.setHoraFinalizacion(LocalDateTime.now());

        return salaEsperaRepository.save(entrada);
    }
}
