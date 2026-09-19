package com.auroraplus.modules.veterinaria.services;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.veterinaria.entities.Propietario;
import com.auroraplus.modules.veterinaria.repositories.PropietarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class PropietarioService {

    @Autowired
    private PropietarioRepository propietarioRepository;

    public List<Propietario> listarActivos(Long tenantId) {
        if (tenantId != null) {
            return propietarioRepository.findByTenantIdAndActivoTrue(tenantId);
        }
        return propietarioRepository.findByActivoTrue();
    }

    public List<Propietario> buscar(Long tenantId, String query) {
        if (tenantId != null) {
            if (query == null || query.isBlank()) {
                return propietarioRepository.findByTenantIdAndActivoTrue(tenantId);
            }
            return propietarioRepository.buscarPorFiltroYTenant(tenantId, query.trim());
        }
        if (query == null || query.isBlank()) {
            return propietarioRepository.findByActivoTrue();
        }
        return propietarioRepository.buscarPorFiltro(query.trim());
    }

    public Optional<Propietario> obtenerPorId(Long tenantId, Long id) {
        if (tenantId != null) {
            return propietarioRepository.findByTenantIdAndId(tenantId, id);
        }
        return propietarioRepository.findById(id);
    }

    public Optional<Propietario> obtenerPorIdentificacion(Long tenantId, String identificacion) {
        if (tenantId != null) {
            return propietarioRepository.findByTenantIdAndIdentificacion(tenantId, identificacion);
        }
        return propietarioRepository.findByIdentificacion(identificacion);
    }

    @Transactional
    public Propietario registrarOActualizar(Long tenantId, Propietario propietario) {
        if (propietario.getId() != null && propietarioRepository.findByTenantIdAndId(tenantId, propietario.getId()).isEmpty()) {
            throw new SecurityException("El propietario no existe o no pertenece a esta empresa");
        }
        if (propietario.getIdentificacion() == null || propietario.getIdentificacion().isBlank()) {
            throw new IllegalArgumentException("La identificación (Cédula/DNI/Pasaporte) del propietario es obligatoria.");
        }
        if (propietario.getNombres() == null || propietario.getNombres().isBlank()) {
            throw new IllegalArgumentException("Los nombres del propietario son obligatorios.");
        }
        if (propietario.getApellidos() == null || propietario.getApellidos().isBlank()) {
            throw new IllegalArgumentException("Los apellidos del propietario son obligatorios.");
        }

        propietario.setTenantId(tenantId);
        return propietarioRepository.save(propietario);
    }

    @Transactional
    public void desactivar(Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
        propietarioRepository.findById(id)
            .filter(p -> tenantId != null && tenantId.equals(p.getTenantId()))
            .ifPresent(p -> {
                p.setActivo(false);
                propietarioRepository.save(p);
            });
    }
}
