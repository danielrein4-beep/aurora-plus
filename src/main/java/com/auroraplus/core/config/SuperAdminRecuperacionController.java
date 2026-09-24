package com.auroraplus.core.config;

import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import com.auroraplus.core.auth.entities.UsuarioSuperAdmin;
import com.auroraplus.core.auth.entities.VerificacionContactoSuperAdmin;
import com.auroraplus.core.auth.repositories.UsuarioSuperAdminRepository;
import com.auroraplus.core.auth.repositories.VerificacionContactoSuperAdminRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * "Olvidé mi contraseña" para el equipo de administración, sin depender del
 * Propietario. Público (sin token; ver WebConfig) y con límite por IP.
 *
 * - Se envía un código a CADA dato de contacto verificado de la cuenta
 *   (correo y/o teléfono) y hay que escribirlos todos: con los dos
 *   registrados, robar solo el correo no alcanza.
 * - La respuesta es siempre la misma exista o no la cuenta, para no revelar
 *   qué usuarios hay.
 * - Resetear la clave NO apaga la verificación en dos pasos: para entrar
 *   después se sigue pidiendo el código de la app de autenticación.
 * - Cierra todas las sesiones abiertas de la cuenta.
 */
@RestController
@RequestMapping("/api/auth/super-admin/recuperar-clave")
public class SuperAdminRecuperacionController {

    private static final Logger log = LoggerFactory.getLogger(SuperAdminRecuperacionController.class);
    private static final String ACCION = "RECUPERAR";
    private static final int MAX_INTENTOS = 5;
    private static final int SEGUNDOS_ENTRE_ENVIOS = 60;
    private static final int LARGO_MINIMO_CLAVE = 10;
    private static final String RESPUESTA_GENERICA =
        "Si la cuenta existe y tiene correo o teléfono verificado, le enviamos un código a cada uno.";

    @Autowired private UsuarioSuperAdminRepository admins;
    @Autowired private VerificacionContactoSuperAdminRepository verificaciones;
    @Autowired private EnvioCodigoVerificacionService envio;
    @Autowired(required = false) private RegistroAuditoriaService auditoria;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public static class SolicitarRequest { public String username; }
    public static class ConfirmarRequest { public String username; public String codigoEmail; public String codigoTelefono; public String nuevaClave; }

    @PostMapping("/solicitar")
    @Transactional
    public Map<String, Object> solicitar(@RequestBody SolicitarRequest req) {
        boolean simulado = false;
        UsuarioSuperAdmin admin = buscarActivo(req.username);
        if (admin != null && (admin.getEmail() != null || admin.getTelefono() != null)) {
            boolean reciente = ultimaSolicitud(admin)
                .map(v -> v.getCreadaEn().isAfter(LocalDateTime.now().minusSeconds(SEGUNDOS_ENTRE_ENVIOS)))
                .orElse(false);
            if (!reciente) {
                anularPendientes(admin);
                try {
                    if (admin.getEmail() != null) simulado |= crearYEnviar(admin, "EMAIL", admin.getEmail());
                    if (admin.getTelefono() != null) simulado |= crearYEnviar(admin, "TELEFONO", admin.getTelefono());
                } catch (RuntimeException e) {
                    // No se informa al cliente (revelaría que la cuenta existe); queda en el log del servidor.
                    log.error("No se pudo enviar el código de recuperación a '{}': {}", admin.getUsername(), e.getMessage());
                }
            }
        }
        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("mensaje", RESPUESTA_GENERICA);
        salida.put("simulado", simulado);
        return salida;
    }

    @PostMapping("/confirmar")
    @Transactional(noRollbackFor = RuntimeException.class)
    public Map<String, String> confirmar(@RequestBody ConfirmarRequest req) {
        if (req.nuevaClave == null || req.nuevaClave.length() < LARGO_MINIMO_CLAVE) {
            throw new RuntimeException("La nueva contraseña debe tener al menos " + LARGO_MINIMO_CLAVE + " caracteres");
        }
        UsuarioSuperAdmin admin = buscarActivo(req.username);
        List<VerificacionContactoSuperAdmin> pendientes = admin == null ? List.of() : pendientes(admin);
        if (pendientes.isEmpty() || pendientes.stream().anyMatch(v -> v.getExpiraEn().isBefore(LocalDateTime.now()))) {
            pendientes.forEach(v -> v.setEstado("ANULADA"));
            verificaciones.saveAll(pendientes);
            throw new RuntimeException("Código incorrecto o vencido; pida uno nuevo");
        }

        boolean todosOk = true;
        for (VerificacionContactoSuperAdmin v : pendientes) {
            v.setIntentos(v.getIntentos() + 1);
            String codigo = "EMAIL".equals(v.getCanal()) ? req.codigoEmail : req.codigoTelefono;
            todosOk &= codigo != null && codigo.trim().matches("\\d{6}") && encoder.matches(codigo.trim(), v.getCodigoActualHash());
        }
        if (!todosOk) {
            int restantes = MAX_INTENTOS - pendientes.get(0).getIntentos();
            if (restantes <= 0) pendientes.forEach(v -> v.setEstado("ANULADA"));
            verificaciones.saveAll(pendientes);
            throw new RuntimeException(restantes <= 0
                ? "Demasiados intentos; pida un código nuevo"
                : "Código incorrecto. Le quedan " + restantes + " intentos");
        }

        admin.setPasswordHash(encoder.encode(req.nuevaClave));
        admin.setDebeCambiarClave(false);
        admin.setTokenVersion(admin.getTokenVersion() + 1);
        admins.save(admin);
        pendientes.forEach(v -> v.setEstado("COMPLETADA"));
        verificaciones.saveAll(pendientes);
        if (auditoria != null) {
            auditoria.registrar(0L, "SUPER_ADMIN", "RECUPERAR_CLAVE_SUPERADMIN", "UsuarioSuperAdmin", admin.getUsername(),
                "Contraseña recuperada con códigos enviados a sus datos de contacto; sesiones anteriores cerradas");
        }
        return Map.of("mensaje", "Contraseña actualizada. Ya puede iniciar sesión.");
    }

    private boolean crearYEnviar(UsuarioSuperAdmin admin, String canal, String destino) {
        String codigo = envio.generarCodigo();
        VerificacionContactoSuperAdmin v = new VerificacionContactoSuperAdmin();
        v.setAdminId(admin.getId());
        v.setCanal(canal);
        v.setAccion(ACCION);
        v.setCodigoActualHash(encoder.encode(codigo));
        v.setExpiraEn(LocalDateTime.now().plusMinutes(EnvioCodigoVerificacionService.MINUTOS_VALIDEZ));
        verificaciones.save(v);
        return envio.enviar(canal, destino, codigo, admin.getUsername(), "para recuperar su contraseña");
    }

    private UsuarioSuperAdmin buscarActivo(String username) {
        if (username == null || username.isBlank()) return null;
        return admins.findByUsername(username.trim()).filter(UsuarioSuperAdmin::isActivo).orElse(null);
    }

    private List<VerificacionContactoSuperAdmin> pendientes(UsuarioSuperAdmin admin) {
        List<VerificacionContactoSuperAdmin> lista = new ArrayList<>();
        for (String canal : List.of("EMAIL", "TELEFONO")) {
            verificaciones.findByAdminIdAndCanalAndEstado(admin.getId(), canal, "PENDIENTE").stream()
                .filter(v -> ACCION.equals(v.getAccion()))
                .forEach(lista::add);
        }
        return lista;
    }

    private Optional<VerificacionContactoSuperAdmin> ultimaSolicitud(UsuarioSuperAdmin admin) {
        return pendientes(admin).stream().max(Comparator.comparing(VerificacionContactoSuperAdmin::getCreadaEn));
    }

    private void anularPendientes(UsuarioSuperAdmin admin) {
        List<VerificacionContactoSuperAdmin> lista = pendientes(admin);
        lista.forEach(v -> v.setEstado("ANULADA"));
        verificaciones.saveAll(lista);
    }
}
