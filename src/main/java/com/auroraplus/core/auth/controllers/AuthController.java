package com.auroraplus.core.auth.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auth.entities.Usuario;
import com.auroraplus.core.auth.services.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Login de usuarios de tenant (dueño/cajero/encargado) y de super-admin.
 * Excluido de AuthInterceptor a propósito (ver WebConfig) — es la única
 * puerta de entrada que no puede exigir ya un token válido.
 */
@RestController("coreAuthController")
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    public static class LoginRequest {
        public Long tenantId;
        public String username;
        public String password;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthService.ResultadoLogin> login(@RequestBody LoginRequest request) {
        if (request.tenantId == null) {
            throw new RuntimeException("tenantId es obligatorio para iniciar sesión");
        }
        return ResponseEntity.ok(authService.login(request.tenantId, request.username, request.password));
    }

    public static class LoginSuperAdminRequest {
        public String username;
        public String password;
    }

    @PostMapping("/login-super-admin")
    public ResponseEntity<Map<String, String>> loginSuperAdmin(@RequestBody LoginSuperAdminRequest request) {
        String token = authService.loginSuperAdmin(request.username, request.password);
        return ResponseEntity.ok(Map.of("token", token));
    }

    // --- Gestión de usuarios del propio tenant — solo el DUEÑO_ADMIN autenticado
    // puede crear/listar/desactivar usuarios de SU negocio (ver AuthInterceptor,
    // que ya puso tenantId/rol en contexto a partir del token, no de un parámetro
    // que el cliente pueda manipular).

    private void exigirDuenoAdmin() {
        if (!"DUENO_ADMIN".equals(AuthContext.getRol())) {
            throw new RuntimeException("Solo el Dueño/Administrador puede gestionar usuarios de este negocio");
        }
    }

    public static class CrearUsuarioRequest {
        public String username;
        public String password;
        public Usuario.Rol rol;
        public String nombreCompleto;
    }

    @PostMapping("/usuarios")
    public ResponseEntity<Usuario> crearUsuario(@RequestParam Long tenantId, @RequestBody CrearUsuarioRequest request) {
        exigirDuenoAdmin();
        return ResponseEntity.ok(authService.crearUsuario(tenantId, request.username, request.password, request.rol, request.nombreCompleto));
    }

    @GetMapping("/usuarios")
    public List<Usuario> listarUsuarios(@RequestParam Long tenantId) {
        exigirDuenoAdmin();
        return authService.listarUsuarios(tenantId);
    }

    @PostMapping("/usuarios/{usuarioId}/desactivar")
    public ResponseEntity<Void> desactivarUsuario(@RequestParam Long tenantId, @PathVariable Long usuarioId) {
        exigirDuenoAdmin();
        authService.desactivarUsuario(tenantId, usuarioId);
        return ResponseEntity.ok().build();
    }
}
