package com.auroraplus.core.config;

import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auth.entities.UsuarioSuperAdmin;
import com.auroraplus.core.auth.repositories.UsuarioSuperAdminRepository;
import com.auroraplus.core.auth.services.JwtService;
import com.auroraplus.core.auth.services.TotpService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Seguridad de la propia cuenta de administración: segundo factor (TOTP) y
 * cambio de contraseña. Toda acción exige re-confirmar la contraseña (y el
 * código, si el 2FA ya está activo): un token robado no basta para apagar el
 * segundo factor ni cambiar la clave.
 *
 * Protegido por TenantInterceptor: solo un token SUPER_ADMIN llega aquí.
 */
@RestController
@RequestMapping("/api/super-admin/seguridad")
public class SuperAdminSeguridadController {

    private static final int LARGO_MINIMO_CLAVE = 10;

    @Autowired
    private UsuarioSuperAdminRepository repositorio;

    @Autowired
    private TotpService totpService;

    @Autowired
    private CifradoSimetricoService cifrado;

    @Autowired
    private JwtService jwtService;

    @Autowired(required = false)
    private RegistroAuditoriaService auditoria;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public static class ClaveRequest { public String password; public String codigo; }
    public static class CodigoRequest { public String codigo; }
    public static class CambiarClaveRequest { public String actual; public String nueva; public String codigo; }

    @GetMapping("/estado")
    public Map<String, Object> estado() {
        UsuarioSuperAdmin admin = adminActual();
        Map<String, Object> salida = new java.util.LinkedHashMap<>();
        salida.put("username", admin.getUsername());
        salida.put("nombreCompleto", admin.getNombreCompleto());
        salida.put("rol", admin.getRol());
        salida.put("totpActivo", admin.isTotpActivo());
        salida.put("debeCambiarClave", admin.isDebeCambiarClave());
        salida.put("email", admin.getEmail());
        salida.put("telefono", admin.getTelefono());
        return salida;
    }

    /** Paso 1: genera un secreto pendiente. No protege nada hasta que se confirme con un código. */
    @PostMapping("/2fa/iniciar")
    @Transactional
    public Map<String, String> iniciar2fa(@RequestBody ClaveRequest req) {
        UsuarioSuperAdmin admin = adminActual();
        if (admin.isTotpActivo()) throw new RuntimeException("El segundo factor ya está activo");
        exigirClave(admin, req.password);
        String secreto = totpService.generarSecreto();
        admin.setTotpSecreto(cifrado.cifrar(secreto));
        repositorio.save(admin);
        return Map.of("secreto", secreto, "uri", totpService.uriOtpAuth("Aurora Plus", admin.getUsername(), secreto));
    }

    /** Paso 2: el código de la app demuestra que el secreto quedó bien guardado en el teléfono. */
    @PostMapping("/2fa/confirmar")
    @Transactional
    public Map<String, Object> confirmar2fa(@RequestBody CodigoRequest req) {
        UsuarioSuperAdmin admin = adminActual();
        if (admin.isTotpActivo()) throw new RuntimeException("El segundo factor ya está activo");
        if (admin.getTotpSecreto() == null) throw new RuntimeException("Primero genere el código de configuración");
        if (!totpService.verificar(cifrado.descifrar(admin.getTotpSecreto()), req.codigo)) {
            throw new RuntimeException("Código incorrecto. Verifique la hora del teléfono e intente con el código nuevo");
        }
        admin.setTotpActivo(true);
        repositorio.save(admin);
        auditar(admin, "ACTIVAR_2FA_SUPERADMIN", "Segundo factor activado");
        return Map.of("totpActivo", true);
    }

    @PostMapping("/2fa/desactivar")
    @Transactional
    public Map<String, Object> desactivar2fa(@RequestBody ClaveRequest req) {
        UsuarioSuperAdmin admin = adminActual();
        if (!admin.isTotpActivo()) throw new RuntimeException("El segundo factor no está activo");
        exigirClave(admin, req.password);
        exigirCodigo(admin, req.codigo);
        admin.setTotpActivo(false);
        admin.setTotpSecreto(null);
        repositorio.save(admin);
        auditar(admin, "DESACTIVAR_2FA_SUPERADMIN", "Segundo factor desactivado");
        return Map.of("totpActivo", false);
    }

    /** Cambia la clave y cierra todas las demás sesiones (tokenVersion++); devuelve un token nuevo para esta. */
    @PostMapping("/cambiar-clave")
    @Transactional
    public ResponseEntity<Map<String, String>> cambiarClave(@RequestBody CambiarClaveRequest req) {
        UsuarioSuperAdmin admin = adminActual();
        exigirClave(admin, req.actual);
        if (admin.isTotpActivo()) exigirCodigo(admin, req.codigo);
        if (req.nueva == null || req.nueva.length() < LARGO_MINIMO_CLAVE) {
            throw new RuntimeException("La nueva contraseña debe tener al menos " + LARGO_MINIMO_CLAVE + " caracteres");
        }
        if (passwordEncoder.matches(req.nueva, admin.getPasswordHash())) {
            throw new RuntimeException("La nueva contraseña debe ser distinta de la actual");
        }
        admin.setPasswordHash(passwordEncoder.encode(req.nueva));
        admin.setDebeCambiarClave(false);
        admin.setTokenVersion(admin.getTokenVersion() + 1);
        repositorio.save(admin);
        auditar(admin, "CAMBIO_CLAVE_SUPERADMIN", "Contraseña de administración cambiada; sesiones anteriores cerradas");
        return ResponseEntity.ok(Map.of("token", jwtService.generarTokenSuperAdmin(admin.getUsername(), admin.getTokenVersion())));
    }

    private UsuarioSuperAdmin adminActual() {
        String username = AuthContext.getUsername();
        return repositorio.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("Sesión administrativa no válida"));
    }

    private void exigirClave(UsuarioSuperAdmin admin, String password) {
        if (password == null || !passwordEncoder.matches(password, admin.getPasswordHash())) {
            throw new RuntimeException("Contraseña incorrecta");
        }
    }

    private void exigirCodigo(UsuarioSuperAdmin admin, String codigo) {
        if (!totpService.verificar(cifrado.descifrar(admin.getTotpSecreto()), codigo)) {
            throw new RuntimeException("Código de verificación incorrecto");
        }
    }

    private void auditar(UsuarioSuperAdmin admin, String accion, String descripcion) {
        if (auditoria != null) {
            auditoria.registrar(0L, "SUPER_ADMIN", accion, "UsuarioSuperAdmin", admin.getUsername(), descripcion);
        }
    }
}
