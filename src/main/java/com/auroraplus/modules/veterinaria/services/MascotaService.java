package com.auroraplus.modules.veterinaria.services;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.veterinaria.entities.Mascota;
import com.auroraplus.modules.veterinaria.entities.Propietario;
import com.auroraplus.modules.veterinaria.repositories.MascotaRepository;
import com.auroraplus.modules.veterinaria.repositories.PropietarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class MascotaService {

    @Autowired
    private MascotaRepository mascotaRepository;

    @Autowired
    private PropietarioRepository propietarioRepository;

    public List<Mascota> listarActivos(Long tenantId) {
        if (tenantId != null) {
            return mascotaRepository.findByTenantIdAndActivoTrue(tenantId);
        }
        return mascotaRepository.findByActivoTrue();
    }

    public List<Mascota> listarPorPropietario(Long tenantId, Long propietarioId) {
        if (tenantId != null) {
            return mascotaRepository.findByTenantIdAndPropietarioIdAndActivoTrue(tenantId, propietarioId);
        }
        return mascotaRepository.findByPropietarioIdAndActivoTrue(propietarioId);
    }

    public List<Mascota> buscar(Long tenantId, String query) {
        if (tenantId != null) {
            if (query == null || query.isBlank()) {
                return mascotaRepository.findByTenantIdAndActivoTrue(tenantId);
            }
            return mascotaRepository.buscarPorFiltroYTenant(tenantId, query.trim());
        }
        if (query == null || query.isBlank()) {
            return mascotaRepository.findByActivoTrue();
        }
        return mascotaRepository.buscarPorFiltro(query.trim());
    }

    public Optional<Mascota> obtenerPorId(Long tenantId, Long id) {
        if (tenantId != null) {
            return mascotaRepository.findByTenantIdAndId(tenantId, id);
        }
        return mascotaRepository.findById(id);
    }

    public Optional<Mascota> obtenerPorMicrochip(Long tenantId, String microchip) {
        if (tenantId != null) {
            return mascotaRepository.findByTenantIdAndMicrochip(tenantId, microchip);
        }
        return Optional.empty();
    }

    @Transactional
    public Mascota registrarOActualizar(Long tenantId, Mascota mascota) {
        if (mascota.getId() != null && mascotaRepository.findByTenantIdAndId(tenantId, mascota.getId()).isEmpty()) {
            throw new SecurityException("La mascota no existe o no pertenece a esta empresa");
        }
        if (mascota.getNombre() == null || mascota.getNombre().isBlank()) {
            throw new IllegalArgumentException("El nombre de la mascota es obligatorio.");
        }
        if (mascota.getPropietario() == null || mascota.getPropietario().getId() == null) {
            throw new IllegalArgumentException("La mascota debe estar vinculada a un propietario.");
        }

        // Validar que el propietario pertenezca al mismo tenant
        Propietario prop = propietarioRepository.findById(mascota.getPropietario().getId())
            .filter(p -> tenantId.equals(p.getTenantId()))
            .orElseThrow(() -> new IllegalArgumentException("El propietario especificado no existe o no pertenece a este tenant."));

        mascota.setPropietario(prop);
        mascota.setTenantId(tenantId);
        return mascotaRepository.save(mascota);
    }

    @Transactional
    public void desactivar(Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
        mascotaRepository.findById(id)
            .filter(m -> tenantId != null && tenantId.equals(m.getTenantId()))
            .ifPresent(m -> {
                m.setActivo(false);
                mascotaRepository.save(m);
            });
    }

    @Transactional
    public void marcarFallecido(Long id, boolean fallecido) {
        Long tenantId = TenantContext.getCurrentTenant();
        mascotaRepository.findById(id)
            .filter(m -> tenantId != null && tenantId.equals(m.getTenantId()))
            .ifPresent(m -> {
                m.setFallecido(fallecido);
                mascotaRepository.save(m);
            });
    }
}
