package com.auroraplus.modules.veterinaria.services;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.veterinaria.entities.CitaVeterinaria;
import com.auroraplus.modules.veterinaria.entities.ConsultaVeterinaria;
import com.auroraplus.modules.veterinaria.repositories.CitaVeterinariaRepository;
import com.auroraplus.modules.veterinaria.repositories.ConsultaVeterinariaRepository;
import com.auroraplus.modules.veterinaria.repositories.MascotaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ConsultaVeterinariaService {

    @Autowired
    private ConsultaVeterinariaRepository consultaVeterinariaRepository;

    @Autowired
    private CitaVeterinariaRepository citaVeterinariaRepository;

    @Autowired
    private MascotaRepository mascotaRepository;

    public List<ConsultaVeterinaria> historialPorMascota(Long tenantId, Long mascotaId) {
        if (tenantId != null) {
            return consultaVeterinariaRepository.findByTenantIdAndMascotaIdOrderByFechaHoraDesc(tenantId, mascotaId);
        }
        return consultaVeterinariaRepository.findByMascotaIdOrderByFechaHoraDesc(mascotaId);
    }

    public List<ConsultaVeterinaria> listarPorVeterinario(Long veterinarioId) {
        return consultaVeterinariaRepository.findByVeterinarioIdOrderByFechaHoraDesc(veterinarioId);
    }

    public Optional<ConsultaVeterinaria> obtenerPorId(Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
        return consultaVeterinariaRepository.findById(id)
            .filter(c -> tenantId != null && tenantId.equals(c.getTenantId()));
    }

    @Transactional
    public ConsultaVeterinaria registrarConsulta(Long tenantId, ConsultaVeterinaria consulta) {
        if (consulta.getMascota() == null || consulta.getMascota().getId() == null) {
            throw new IllegalArgumentException("La consulta veterinaria debe estar asociada a una mascota.");
        }
        if (consulta.getMotivoConsulta() == null || consulta.getMotivoConsulta().isBlank()) {
            throw new IllegalArgumentException("El motivo de consulta es obligatorio.");
        }

        // Validar que la mascota pertenezca al tenant
        mascotaRepository.findByTenantIdAndId(tenantId, consulta.getMascota().getId())
            .orElseThrow(() -> new IllegalArgumentException("La mascota especificada no pertenece a este tenant."));

        consulta.setTenantId(tenantId);
        ConsultaVeterinaria guardada = consultaVeterinariaRepository.save(consulta);

        // Si la consulta viene de una cita agendada, actualizar su estado a ATENDIDA
        if (consulta.getCitaId() != null) {
            citaVeterinariaRepository.findById(consulta.getCitaId())
                .filter(cita -> tenantId.equals(cita.getTenantId()))
                .ifPresent(cita -> {
                    cita.setEstado(CitaVeterinaria.EstadoCita.ATENDIDA);
                    citaVeterinariaRepository.save(cita);
                });
        }

        // Si se registró peso en la consulta, actualizar el peso actual de la mascota
        if (consulta.getPesoKg() != null) {
            mascotaRepository.findById(consulta.getMascota().getId())
                .filter(m -> tenantId.equals(m.getTenantId()))
                .ifPresent(m -> {
                    m.setPesoActualKg(consulta.getPesoKg());
                    mascotaRepository.save(m);
                });
        }

        return guardada;
    }

    @Transactional
    public void eliminarConsulta(Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
        ConsultaVeterinaria consulta = consultaVeterinariaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Consulta veterinaria no encontrada con ID: " + id));
        if (tenantId == null || !tenantId.equals(consulta.getTenantId())) {
            throw new RuntimeException("Violación de seguridad: la consulta no pertenece a este tenant");
        }
        consultaVeterinariaRepository.delete(consulta);
    }
}
