package com.auroraplus.modules.tamanacocomercial.controllers;

import com.auroraplus.modules.tamanacocomercial.entities.Usuario;
import com.auroraplus.modules.tamanacocomercial.repositories.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tamanaco-comercial/usuarios")
public class UsuarioController {

    @Autowired
    private UsuarioRepository usuarioRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private static final int MAX_CEO = 2;

    private boolean esCEO(Usuario u) {
        if (u == null) return false;
        String rol = (u.getRol() == null) ? "" : u.getRol().toUpperCase();
        return rol.equals("CEO") || rol.equals("ADMIN");
    }

    private Map<String, Object> sanitizarUsuario(Usuario u) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", u.getId());
        map.put("nombre", u.getNombre());
        map.put("email", u.getEmail());
        map.put("rol", u.getRol());
        map.put("activo", u.getActivo());
        return map;
    }

    @GetMapping
    public ResponseEntity<?> listarUsuarios() {
        List<Map<String, Object>> lista = usuarioRepository.findAllByOrderByNombreAsc().stream()
            .map(this::sanitizarUsuario)
            .collect(Collectors.toList());
        return ResponseEntity.ok(lista);
    }

    @PostMapping
    public ResponseEntity<?> crearUsuario(@RequestParam Long tenantId, @RequestBody Usuario nuevo) {

        if (nuevo.getEmail() == null || nuevo.getEmail().trim().isEmpty() ||
            nuevo.getPassword() == null || nuevo.getPassword().trim().isEmpty() ||
            nuevo.getNombre() == null || nuevo.getNombre().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Nombre, correo y contraseña son obligatorios"));
        }

        String email = nuevo.getEmail().trim().toLowerCase();
        if (usuarioRepository.existsByEmailIgnoreCase(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", "Ya existe un usuario registrado con este correo"));
        }

        String rolNuevo = (nuevo.getRol() != null) ? nuevo.getRol().toUpperCase() : "OPERACIONES";
        if (rolNuevo.equals("CEO") || rolNuevo.equals("ADMIN")) {
            long ceoActuales = usuarioRepository.findAll().stream()
                .filter(u -> esCEO(u) && Boolean.TRUE.equals(u.getActivo()))
                .count();
            if (ceoActuales >= MAX_CEO) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Ya existen " + MAX_CEO + " CEO registrados. Límite máximo alcanzado."));
            }
        }

        nuevo.setTenantId(tenantId);
        nuevo.setEmail(email);
        nuevo.setPassword(passwordEncoder.encode(nuevo.getPassword()));
        if (nuevo.getRol() == null || nuevo.getRol().trim().isEmpty()) {
            nuevo.setRol("OPERACIONES");
        }
        if (nuevo.getActivo() == null) nuevo.setActivo(true);

        Usuario guardado = usuarioRepository.save(nuevo);
        return ResponseEntity.status(HttpStatus.CREATED).body(sanitizarUsuario(guardado));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarUsuario(@PathVariable Long id, @RequestBody Usuario datos) {
        return usuarioRepository.findById(id)
            .map(u -> {
                if (datos.getNombre() != null && !datos.getNombre().trim().isEmpty()) {
                    u.setNombre(datos.getNombre().trim());
                }
                if (datos.getEmail() != null && !datos.getEmail().trim().isEmpty()) {
                    String nuevoEmail = datos.getEmail().trim().toLowerCase();
                    if (!nuevoEmail.equalsIgnoreCase(u.getEmail()) && usuarioRepository.existsByEmailIgnoreCase(nuevoEmail)) {
                        return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body(Map.of("error", "Ese correo ya está en uso por otro usuario"));
                    }
                    u.setEmail(nuevoEmail);
                }
                if (datos.getPassword() != null && !datos.getPassword().trim().isEmpty()) {
                    u.setPassword(passwordEncoder.encode(datos.getPassword()));
                }
                if (datos.getRol() != null && !datos.getRol().trim().isEmpty()) {
                    String nuevoRol = datos.getRol().toUpperCase();
                    boolean yaEsCEO = esCEO(u);
                    boolean seraCEO = nuevoRol.equals("CEO") || nuevoRol.equals("ADMIN");
                    if (!yaEsCEO && seraCEO) {
                        long ceoActuales = usuarioRepository.findAll().stream()
                            .filter(usr -> esCEO(usr) && Boolean.TRUE.equals(usr.getActivo()))
                            .count();
                        if (ceoActuales >= MAX_CEO) {
                            return ResponseEntity.status(HttpStatus.CONFLICT)
                                .body(Map.of("error", "Ya existen " + MAX_CEO + " CEO. Límite máximo alcanzado."));
                        }
                    }
                    u.setRol(nuevoRol);
                }
                if (datos.getActivo() != null) {
                    if (!datos.getActivo() && esCEO(u)) {
                        long ceoActivos = usuarioRepository.findAll().stream()
                            .filter(usr -> esCEO(usr) && Boolean.TRUE.equals(usr.getActivo()))
                            .count();
                        if (ceoActivos <= 1) {
                            return ResponseEntity.badRequest()
                                .body(Map.of("error", "No puedes desactivar al único CEO activo del sistema"));
                        }
                    }
                    u.setActivo(datos.getActivo());
                }

                Usuario actualizado = usuarioRepository.save(u);
                return ResponseEntity.ok(sanitizarUsuario(actualizado));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarODesactivar(@PathVariable Long id) {
        return usuarioRepository.findById(id)
            .map(u -> {
                if (esCEO(u)) {
                    long ceoActivos = usuarioRepository.findAll().stream()
                        .filter(usr -> esCEO(usr) && Boolean.TRUE.equals(usr.getActivo()))
                        .count();
                    if (ceoActivos <= 1) {
                        return ResponseEntity.badRequest()
                            .body(Map.of("error", "No puedes eliminar al único CEO activo del sistema"));
                    }
                }
                u.setActivo(false);
                usuarioRepository.save(u);
                return ResponseEntity.ok(Map.of("mensaje", "Usuario desactivado correctamente"));
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
