package com.auroraplus.modules.salud.services;

import com.auroraplus.modules.salud.entities.Paciente;
import com.auroraplus.modules.salud.repositories.PacienteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class PacienteService {

    @Autowired
    private PacienteRepository pacienteRepository;

    public List<Paciente> listarActivos() {
        return pacienteRepository.findByActivoTrue();
    }

    public List<Paciente> listarActivos(Long tenantId) {
        if (tenantId != null) {
            return pacienteRepository.findByTenantIdAndActivoTrue(tenantId);
        }
        return pacienteRepository.findByActivoTrue();
    }

    public List<Paciente> buscar(String query) {
        if (query == null || query.isBlank()) {
            return pacienteRepository.findByActivoTrue();
        }
        return pacienteRepository.buscarPorFiltro(query.trim());
    }

    public List<Paciente> buscar(Long tenantId, String query) {
        if (tenantId != null) {
            if (query == null || query.isBlank()) {
                return pacienteRepository.findByTenantIdAndActivoTrue(tenantId);
            }
            return pacienteRepository.buscarPorFiltroYTenant(tenantId, query.trim());
        }
        return buscar(query);
    }

    public Optional<Paciente> obtenerPorId(Long id) {
        return pacienteRepository.findById(id);
    }

    public Optional<Paciente> obtenerPorId(Long tenantId, Long id) {
        if (tenantId != null) {
            return pacienteRepository.findByTenantIdAndId(tenantId, id);
        }
        return pacienteRepository.findById(id);
    }

    public Optional<Paciente> obtenerPorIdentificacion(String identificacion) {
        return pacienteRepository.findByIdentificacion(identificacion);
    }

    public Optional<Paciente> obtenerPorIdentificacion(Long tenantId, String identificacion) {
        if (tenantId != null) {
            return pacienteRepository.findByTenantIdAndIdentificacion(tenantId, identificacion);
        }
        return pacienteRepository.findByIdentificacion(identificacion);
    }

    @Transactional
    public Paciente registrarOActualizar(Long tenantId, Paciente paciente) {
        if (paciente.getIdentificacion() == null || paciente.getIdentificacion().isBlank()) {
            throw new IllegalArgumentException("La identificación (Cédula/DNI/Pasaporte) es obligatoria.");
        }
        if (paciente.getNombres() == null || paciente.getNombres().isBlank()) {
            throw new IllegalArgumentException("Los nombres del paciente son obligatorios.");
        }
        if (paciente.getApellidos() == null || paciente.getApellidos().isBlank()) {
            throw new IllegalArgumentException("Los apellidos del paciente son obligatorios.");
        }

        paciente.setTenantId(tenantId);
        return pacienteRepository.save(paciente);
    }

    @Transactional
    public void desactivar(Long id) {
        pacienteRepository.findById(id).ifPresent(p -> {
            p.setActivo(false);
            pacienteRepository.save(p);
        });
    }
}
