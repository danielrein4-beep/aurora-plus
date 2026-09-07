package com.auroraplus.core.auth.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auth.entities.Usuario;
import com.auroraplus.core.auth.services.AuthService;
import com.auroraplus.core.config.TenantProvisioningService;
import com.auroraplus.core.config.entities.LicenciaTenant;
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

    @Autowired
    private TenantProvisioningService tenantProvisioningService;

    public static class RegistroNegocioRequest {
        public String nombreEmpresa;
        public String moduloPrincipal; // salud, horeca, ganaderia, etc.
        public String emailContacto;
        public String telefonoContacto;
        public String username; // el correo con el que inician sesión
        public String password;
    }

    // Registro público de autoservicio — crea el tenant, activa su módulo y su
    // usuario DUENO_ADMIN, y entrega el token de una vez para no pedir un
    // segundo login. Prueba gratuita de 1 mes por defecto (ver
    // TenantProvisioningService — mesesVigencia null = 1 mes).
    @PostMapping("/registro-negocio")
    public ResponseEntity<AuthService.ResultadoLogin> registroNegocio(@RequestBody RegistroNegocioRequest request) {
        if (request.username == null || request.username.isBlank()) {
            throw new RuntimeException("El correo es obligatorio");
        }
        if (request.password == null || request.password.length() < 6) {
            throw new RuntimeException("La contraseña debe tener al menos 6 caracteres");
        }
        if (authService.existeUsername(request.username)) {
            throw new RuntimeException("Ya existe una cuenta con este correo");
        }

        TenantProvisioningService.AltaTenantRequest alta = new TenantProvisioningService.AltaTenantRequest();
        alta.nombreEmpresa = request.nombreEmpresa;
        alta.moduloPrincipal = request.moduloPrincipal;
        alta.tipoLicencia = LicenciaTenant.TipoLicencia.COMERCIAL;
        alta.emailContacto = request.emailContacto;
        alta.telefonoContacto = request.telefonoContacto;
        alta.usuarioInicial = request.username;
        alta.passwordInicial = request.password;
        LicenciaTenant licencia = tenantProvisioningService.crear(alta);

        return ResponseEntity.ok(authService.login(licencia.getTenantId(), request.username, request.password));
    }

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

    public static class LoginPorUsernameRequest {
        public String username;
        public String password;
    }

    // Login público sin tenantId — para el frontend de autoservicio, donde el
    // usuario solo conoce su correo/usuario y contraseña.
    @PostMapping("/login-directo")
    public ResponseEntity<AuthService.ResultadoLogin> loginDirecto(@RequestBody LoginPorUsernameRequest request) {
        return ResponseEntity.ok(authService.loginPorUsername(request.username, request.password));
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

    // En Salud el médico ES el dueño de su consultorio (un solo médico por
    // tenant, ver MedicoTenantResolver) — su rol de sistema es MEDICO, no
    // DUENO_ADMIN, pero igual debe poder gestionar a su propio staff (ej. dar
    // de alta a su recepcionista).
    private void exigirDuenoAdmin() {
        String rol = AuthContext.getRol();
        if (!"DUENO_ADMIN".equals(rol) && !"MEDICO".equals(rol)) {
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
