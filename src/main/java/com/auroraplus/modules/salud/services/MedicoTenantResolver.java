package com.auroraplus.modules.salud.services;

import com.auroraplus.core.auth.entities.Usuario;
import com.auroraplus.core.auth.repositories.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Cada tenant de Salud es la práctica de UN SOLO médico (no una clínica con
 * varios) — así que nunca hay que "elegir" ni "asignar" médico en ningún
 * lado: siempre es el único usuario con rol MEDICO de ese tenant. Este
 * resolver reemplaza la necesidad de que recepción conozca o escriba el
 * medicoId a mano en cita, sala de espera o bloqueos de agenda.
 */
@Service
public class MedicoTenantResolver {

    @Autowired
    private UsuarioRepository usuarioRepository;

    public static class MedicoInfo {
        public final Long id;
        public final String nombre;
        public MedicoInfo(Long id, String nombre) {
            this.id = id;
            this.nombre = nombre;
        }
    }

    public Optional<MedicoInfo> resolverMedicoDelTenant(Long tenantId) {
        return usuarioRepository.findByTenantId(tenantId).stream()
            .filter(u -> u.getRol() == Usuario.Rol.MEDICO)
            .findFirst()
            .map(u -> new MedicoInfo(u.getId(), u.getNombreCompleto() != null ? u.getNombreCompleto() : u.getUsername()));
    }
}
