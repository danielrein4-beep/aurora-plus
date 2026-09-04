package com.auroraplus.modules.tamanacocomercial.controllers;

import com.auroraplus.modules.tamanacocomercial.entities.Usuario;
import com.auroraplus.modules.tamanacocomercial.repositories.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * A diferencia del AuthController original, este NO acepta contraseñas en
 * texto plano bajo ninguna circunstancia: el admin inicial se crea con hash
 * BCrypt y el login siempre verifica con BCryptPasswordEncoder.matches(...).
 * El original comparaba texto plano como fallback de compatibilidad; eso
 * habría expuesto contraseñas en texto claro en una base de datos nueva.
 */
@RestController
@RequestMapping("/api/tamanaco-comercial/auth")
public class AuthController {

    @Autowired
    private UsuarioRepository usuarioRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @PostMapping("/inicializar-admin")
    public ResponseEntity<?> inicializarUsuarioAdmin(@RequestParam Long tenantId) {
        if (usuarioRepository.count() > 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Ya existen usuarios registrados"));
        }
        Usuario admin = new Usuario();
        admin.setTenantId(tenantId);
        admin.setNombre("Administrador");
        admin.setEmail("admin@tamanaco.com");
        admin.setPassword(passwordEncoder.encode("admin123"));
        admin.setRol("ADMIN");
        admin.setActivo(true);
        usuarioRepository.save(admin);
        return ResponseEntity.ok(Map.of("mensaje", "Usuario Administrador creado: admin@tamanaco.com / admin123 (cámbiala tras el primer login)"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credenciales) {
        String email = credenciales.get("email");
        String password = credenciales.get("password");

        if (email == null || password == null || email.trim().isEmpty() || password.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Correo y contraseña son obligatorios"));
        }

        Optional<Usuario> usuarioOpt = usuarioRepository.findByEmailIgnoreCase(email.trim());
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Credenciales incorrectas"));
        }

        Usuario usuario = usuarioOpt.get();
        if (!Boolean.TRUE.equals(usuario.getActivo())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Este usuario está desactivado. Contacta al Administrador."));
        }

        if (!passwordEncoder.matches(password, usuario.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Credenciales incorrectas"));
        }

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("id", usuario.getId());
        respuesta.put("nombre", usuario.getNombre());
        respuesta.put("email", usuario.getEmail());
        respuesta.put("rol", usuario.getRol());
        respuesta.put("activo", usuario.getActivo());

        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/roles")
    public List<Map<String, String>> obtenerRoles() {
        return List.of(
            Map.of("codigo", "ADMIN", "nombre", "Administrador (Acceso Total)", "descripcion", "Control total: nómina, tarifas, usuarios y finanzas"),
            Map.of("codigo", "OPERADOR", "nombre", "Operador General", "descripcion", "Registro de despachos, gastos e inventario"),
            Map.of("codigo", "DESPACHADOR", "nombre", "Despachador / Cargas (Solo Patio)", "descripcion", "Solo registrar y ver cargas de camiones/despachos"),
            Map.of("codigo", "CONSULTA", "nombre", "Consulta (Solo Lectura)", "descripcion", "Solo ver listados y generar reportes PDF")
        );
    }
}
