package com.auroraplus.core.auth.services;

import com.auroraplus.core.auth.entities.Usuario;
import com.auroraplus.core.auth.entities.UsuarioSuperAdmin;
import com.auroraplus.core.auth.repositories.UsuarioRepository;
import com.auroraplus.core.auth.repositories.UsuarioSuperAdminRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuthService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private UsuarioSuperAdminRepository usuarioSuperAdminRepository;

    @Autowired
    private JwtService jwtService;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public static class ResultadoLogin {
        public final String token;
        public final String rol;
        public final String username;
        public ResultadoLogin(String token, String rol, String username) {
            this.token = token;
            this.rol = rol;
            this.username = username;
        }
    }

    /** Credenciales inválidas o usuario inactivo dan el MISMO mensaje genérico — no revelar cuál de las dos falló. */
    public ResultadoLogin login(Long tenantId, String username, String password) {
        Usuario usuario = usuarioRepository.buscarPorTenantYUsername(tenantId, username)
            .orElseThrow(() -> new RuntimeException("Usuario o contraseña incorrectos"));

        if (!usuario.isActivo() || !passwordEncoder.matches(password, usuario.getPasswordHash())) {
            throw new RuntimeException("Usuario o contraseña incorrectos");
        }

        String token = jwtService.generarTokenTenant(tenantId, usuario.getUsername(), usuario.getRol().name());
        return new ResultadoLogin(token, usuario.getRol().name(), usuario.getUsername());
    }

    public String loginSuperAdmin(String username, String password) {
        UsuarioSuperAdmin admin = usuarioSuperAdminRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("Usuario o contraseña incorrectos"));

        if (!admin.isActivo() || !passwordEncoder.matches(password, admin.getPasswordHash())) {
            throw new RuntimeException("Usuario o contraseña incorrectos");
        }

        return jwtService.generarTokenSuperAdmin(admin.getUsername());
    }

    public Usuario crearUsuario(Long tenantId, String username, String password, Usuario.Rol rol, String nombreCompleto) {
        if (username == null || username.isBlank()) {
            throw new RuntimeException("El nombre de usuario es obligatorio");
        }
        if (password == null || password.length() < 6) {
            throw new RuntimeException("La contraseña debe tener al menos 6 caracteres");
        }
        if (usuarioRepository.buscarPorTenantYUsername(tenantId, username).isPresent()) {
            throw new RuntimeException("Ya existe un usuario '" + username + "' en este negocio");
        }

        Usuario usuario = new Usuario();
        usuario.setTenantId(tenantId);
        usuario.setUsername(username);
        usuario.setPasswordHash(passwordEncoder.encode(password));
        usuario.setRol(rol);
        usuario.setNombreCompleto(nombreCompleto);
        return usuarioRepository.save(usuario);
    }

    public List<Usuario> listarUsuarios(Long tenantId) {
        return usuarioRepository.findByTenantId(tenantId);
    }

    public void desactivarUsuario(Long tenantId, Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        if (!usuario.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: usuario no pertenece a este tenant");
        }
        usuario.setActivo(false);
        usuarioRepository.save(usuario);
    }

    public void crearSuperAdmin(String username, String password) {
        UsuarioSuperAdmin admin = new UsuarioSuperAdmin();
        admin.setUsername(username);
        admin.setPasswordHash(passwordEncoder.encode(password));
        usuarioSuperAdminRepository.save(admin);
    }
}
