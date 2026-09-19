package com.auroraplus.modules.veterinaria.services;

import com.auroraplus.core.auth.entities.Usuario;
import com.auroraplus.core.auth.repositories.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Resolver de Veterinario por Tenant.
 * Resuelve el usuario profesional responsable del tenant (con rol MEDICO o DUENO_ADMIN)
 * para asociar automáticamente las citas, consultas y salas de espera sin requerir selección manual.
 */
@Service
public class VeterinarioTenantResolver {

    @Autowired
    private UsuarioRepository usuarioRepository;

    public static class VeterinarioInfo {
        public final Long id;
        public final String nombre;

        public VeterinarioInfo(Long id, String nombre) {
            this.id = id;
            this.nombre = nombre;
        }
    }

    public Optional<VeterinarioInfo> resolverVeterinarioDelTenant(Long tenantId) {
        if (tenantId == null) return Optional.empty();
        return usuarioRepository.findByTenantId(tenantId).stream()
            .filter(u -> u.getRol() == Usuario.Rol.MEDICO || u.getRol() == Usuario.Rol.DUENO_ADMIN)
            .findFirst()
            .map(u -> new VeterinarioInfo(u.getId(), u.getNombreCompleto() != null ? u.getNombreCompleto() : u.getUsername()));
    }
}
