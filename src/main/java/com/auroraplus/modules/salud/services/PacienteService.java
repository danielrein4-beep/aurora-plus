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

    public List<Paciente> buscar(String query) {
        if (query == null || query.isBlank()) {
            return pacienteRepository.findByActivoTrue();
        }
        return pacienteRepository.buscarPorFiltro(query.trim());
    }

    public Optional<Paciente> obtenerPorId(Long id) {
        return pacienteRepository.findById(id);
    }

    public Optional<Paciente> obtenerPorIdentificacion(String identificacion) {
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
