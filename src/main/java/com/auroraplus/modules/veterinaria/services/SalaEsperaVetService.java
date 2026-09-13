package com.auroraplus.modules.veterinaria.services;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.veterinaria.entities.CitaVeterinaria;
import com.auroraplus.modules.veterinaria.entities.SalaEsperaVet;
import com.auroraplus.modules.veterinaria.repositories.CitaVeterinariaRepository;
import com.auroraplus.modules.veterinaria.repositories.SalaEsperaVetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class SalaEsperaVetService {

    @Autowired
    private SalaEsperaVetRepository salaEsperaVetRepository;

    @Autowired
    private CitaVeterinariaRepository citaVeterinariaRepository;

    public List<SalaEsperaVet> listarColaActiva() {
        return salaEsperaVetRepository.findByEstadoInOrderByHoraLlegadaAsc(
            List.of(SalaEsperaVet.EstadoEspera.EN_ESPERA, SalaEsperaVet.EstadoEspera.EN_CONSULTA)
        );
    }

    @Transactional
    public SalaEsperaVet checkIn(Long tenantId, SalaEsperaVet entrada) {
        entrada.setTenantId(tenantId);
        entrada.setHoraLlegada(LocalDateTime.now());
        entrada.setEstado(SalaEsperaVet.EstadoEspera.EN_ESPERA);

        SalaEsperaVet guardada = salaEsperaVetRepository.save(entrada);

        if (entrada.getCitaId() != null) {
            citaVeterinariaRepository.findById(entrada.getCitaId())
                .filter(c -> tenantId.equals(c.getTenantId()))
                .ifPresent(c -> {
                    c.setEstado(CitaVeterinaria.EstadoCita.EN_SALA);
                    citaVeterinariaRepository.save(c);
                });
        }

        return guardada;
    }

    private SalaEsperaVet obtenerEntradaPropia(Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
        SalaEsperaVet entrada = salaEsperaVetRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Entrada de sala no encontrada con ID: " + id));
        if (tenantId == null || !tenantId.equals(entrada.getTenantId())) {
            throw new RuntimeException("Violación de seguridad: la entrada de sala no pertenece a este tenant");
        }
        return entrada;
    }

    @Transactional
    public SalaEsperaVet llamarAConsultorio(Long id, String consultorio, Long veterinarioId, String veterinarioNombre) {
        SalaEsperaVet entrada = obtenerEntradaPropia(id);
        Long tenantId = entrada.getTenantId();

        entrada.setEstado(SalaEsperaVet.EstadoEspera.EN_CONSULTA);
        entrada.setHoraLlamado(LocalDateTime.now());
        if (consultorio != null) entrada.setConsultorio(consultorio);
        if (veterinarioId != null) entrada.setVeterinarioId(veterinarioId);
        if (veterinarioNombre != null) entrada.setVeterinarioNombre(veterinarioNombre);

        if (entrada.getCitaId() != null) {
            citaVeterinariaRepository.findById(entrada.getCitaId())
                .filter(c -> tenantId.equals(c.getTenantId()))
                .ifPresent(c -> {
                    c.setEstado(CitaVeterinaria.EstadoCita.EN_CONSULTA);
                    citaVeterinariaRepository.save(c);
                });
        }

        return salaEsperaVetRepository.save(entrada);
    }

    @Transactional
    public SalaEsperaVet finalizarAtencion(Long id) {
        SalaEsperaVet entrada = obtenerEntradaPropia(id);

        entrada.setEstado(SalaEsperaVet.EstadoEspera.ATENDIDO);
        entrada.setHoraFinalizacion(LocalDateTime.now());

        return salaEsperaVetRepository.save(entrada);
    }
}
