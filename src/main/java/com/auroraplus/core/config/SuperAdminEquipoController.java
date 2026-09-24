package com.auroraplus.core.config;

import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auth.entities.UsuarioSuperAdmin;
import com.auroraplus.core.auth.repositories.UsuarioSuperAdminRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.util.*;

/**
 * Equipo de administración de la plataforma: alta de cuentas con rol, cambio
 * de rol, suspensión y reseteo de acceso. Solo PROPIETARIO llega aquí (ver
 * PermisosSuperAdmin).
 *
 * Cada cuenta nueva o reseteada recibe una clave temporal que se muestra una
 * sola vez y debe cambiarse en el primer ingreso. Nunca puede quedar el
 * sistema sin un PROPIETARIO activo.
 */
@RestController
@RequestMapping("/api/super-admin/equipo")
public class SuperAdminEquipoController {

    private static final String CARACTERES_CLAVE = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

    @Autowired
    private UsuarioSuperAdminRepository repositorio;

    @Autowired(required = false)
    private RegistroAuditoriaService auditoria;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final SecureRandom random = new SecureRandom();

    public static class CrearMiembroRequest { public String username; public String nombreCompleto; public String rol; }
    public static class RolRequest { public String rol; }
    public static class ActivoRequest { public boolean activo; }

    @GetMapping
    public List<Map<String, Object>> listar() {
        return repositorio.findAll().stream()
            .sorted(Comparator.comparing(UsuarioSuperAdmin::getId))
            .map(this::aVista)
            .toList();
    }

    @PostMapping
    @Transactional
    public Map<String, Object> crear(@RequestBody CrearMiembroRequest req) {
        String username = req.username != null ? req.username.trim().toLowerCase() : "";
        if (!username.matches("[a-z0-9._@-]{3,60}")) {
            throw new RuntimeException("El usuario debe tener entre 3 y 60 caracteres: letras, números, punto, guion o @");
        }
        if (repositorio.findByUsername(username).isPresent()) {
            throw new RuntimeException("Ya existe una cuenta con el usuario '" + username + "'");
        }
        String rol = validarRol(req.rol);
        String claveTemporal = generarClaveTemporal();

        UsuarioSuperAdmin nuevo = new UsuarioSuperAdmin();
        nuevo.setUsername(username);
        nuevo.setNombreCompleto(req.nombreCompleto != null && !req.nombreCompleto.isBlank() ? req.nombreCompleto.trim() : null);
        nuevo.setRol(rol);
        nuevo.setPasswordHash(passwordEncoder.encode(claveTemporal));
        nuevo.setDebeCambiarClave(true);
        repositorio.save(nuevo);
        auditar("CREAR_MIEMBRO_EQUIPO", username, "Cuenta de administración creada con rol " + rol);

        Map<String, Object> salida = aVista(nuevo);
        salida.put("claveTemporal", claveTemporal);
        return salida;
    }

    @PutMapping("/{id:[0-9]+}/rol")
    @Transactional
    public Map<String, Object> cambiarRol(@PathVariable Long id, @RequestBody RolRequest req) {
        UsuarioSuperAdmin miembro = buscar(id);
        noSobreSiMismo(miembro, "cambiar su propio rol");
        String rol = validarRol(req.rol);
        if ("PROPIETARIO".equals(miembro.getRol()) && !"PROPIETARIO".equals(rol)) exigirOtroPropietario(miembro);
        String anterior = miembro.getRol();
        miembro.setRol(rol);
        repositorio.save(miembro);
        auditar("CAMBIAR_ROL_EQUIPO", miembro.getUsername(), "Rol cambiado de " + anterior + " a " + rol);
        return aVista(miembro);
    }

    @PostMapping("/{id:[0-9]+}/activo")
    @Transactional
    public Map<String, Object> cambiarActivo(@PathVariable Long id, @RequestBody ActivoRequest req) {
        UsuarioSuperAdmin miembro = buscar(id);
        noSobreSiMismo(miembro, "suspender su propia cuenta");
        if (!req.activo && "PROPIETARIO".equals(miembro.getRol())) exigirOtroPropietario(miembro);
        miembro.setActivo(req.activo);
        // Suspender cierra de inmediato cualquier sesión abierta de esa cuenta.
        if (!req.activo) miembro.setTokenVersion(miembro.getTokenVersion() + 1);
        repositorio.save(miembro);
        auditar(req.activo ? "REACTIVAR_MIEMBRO_EQUIPO" : "SUSPENDER_MIEMBRO_EQUIPO", miembro.getUsername(),
            req.activo ? "Cuenta de administración reactivada" : "Cuenta de administración suspendida");
        return aVista(miembro);
    }

    /** Para quien olvidó su clave o perdió el teléfono del 2FA: clave temporal nueva, sin 2FA y sesiones cerradas. */
    @PostMapping("/{id:[0-9]+}/resetear-acceso")
    @Transactional
    public Map<String, Object> resetearAcceso(@PathVariable Long id) {
        UsuarioSuperAdmin miembro = buscar(id);
        noSobreSiMismo(miembro, "resetear su propio acceso (use Seguridad de la cuenta)");
        String claveTemporal = generarClaveTemporal();
        miembro.setPasswordHash(passwordEncoder.encode(claveTemporal));
        miembro.setDebeCambiarClave(true);
        miembro.setTotpActivo(false);
        miembro.setTotpSecreto(null);
        miembro.setTokenVersion(miembro.getTokenVersion() + 1);
        repositorio.save(miembro);
        auditar("RESETEAR_ACCESO_EQUIPO", miembro.getUsername(), "Acceso reseteado: clave temporal nueva y verificación en dos pasos desactivada");

        Map<String, Object> salida = aVista(miembro);
        salida.put("claveTemporal", claveTemporal);
        return salida;
    }

    private UsuarioSuperAdmin buscar(Long id) {
        return repositorio.findById(id).orElseThrow(() -> new RuntimeException("Miembro del equipo no encontrado"));
    }

    private void noSobreSiMismo(UsuarioSuperAdmin miembro, String accion) {
        if (miembro.getUsername().equals(AuthContext.getUsername())) {
            throw new RuntimeException("No puede " + accion);
        }
    }

    private void exigirOtroPropietario(UsuarioSuperAdmin miembro) {
        boolean hayOtro = repositorio.findAll().stream()
            .anyMatch(u -> !u.getId().equals(miembro.getId()) && u.isActivo() && "PROPIETARIO".equals(u.getRol()));
        if (!hayOtro) throw new RuntimeException("Debe quedar al menos un Propietario activo");
    }

    private static String validarRol(String rol) {
        String normalizado = rol != null ? rol.trim().toUpperCase() : "";
        if (!PermisosSuperAdmin.ROLES.contains(normalizado)) throw new RuntimeException("Rol no válido: " + rol);
        return normalizado;
    }

    private String generarClaveTemporal() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 14; i++) sb.append(CARACTERES_CLAVE.charAt(random.nextInt(CARACTERES_CLAVE.length())));
        return sb.toString();
    }

    private Map<String, Object> aVista(UsuarioSuperAdmin u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("username", u.getUsername());
        m.put("nombreCompleto", u.getNombreCompleto());
        m.put("rol", u.getRol());
        m.put("email", u.getEmail());
        m.put("telefono", u.getTelefono());
        m.put("activo", u.isActivo());
        m.put("totpActivo", u.isTotpActivo());
        m.put("debeCambiarClave", u.isDebeCambiarClave());
        m.put("fechaCreacion", u.getFechaCreacion());
        m.put("ultimoAcceso", u.getUltimoAcceso());
        m.put("esUstedMismo", u.getUsername().equals(AuthContext.getUsername()));
        return m;
    }

    private void auditar(String accion, String username, String descripcion) {
        if (auditoria != null) {
            auditoria.registrar(0L, "SUPER_ADMIN", accion, "UsuarioSuperAdmin", username,
                descripcion + " (por " + AuthContext.getUsername() + ")");
        }
    }
}
