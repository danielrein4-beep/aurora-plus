package com.auroraplus.core.config;

import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auth.entities.UsuarioSuperAdmin;
import com.auroraplus.core.auth.entities.VerificacionContactoSuperAdmin;
import com.auroraplus.core.auth.repositories.UsuarioSuperAdminRepository;
import com.auroraplus.core.auth.repositories.VerificacionContactoSuperAdminRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

import static com.auroraplus.core.config.EnvioCodigoVerificacionService.enmascarar;

/**
 * Correo y teléfono de la propia cuenta de administración, siempre verificados:
 *
 * - AGREGAR: código al dato nuevo.
 * - CAMBIAR: código al dato actual (prueba que es el dueño) y otro al nuevo.
 * - QUITAR:  código al dato actual.
 *
 * Además cada solicitud re-confirma la contraseña, así que un token robado no
 * alcanza para desviar el contacto de la cuenta. Códigos de 6 dígitos, válidos
 * 10 minutos, máximo 5 intentos por solicitud y un envío por minuto por canal.
 *
 * Si el correo (SMTP) o el WhatsApp de la plataforma no están configurados, el
 * envío falla con un mensaje claro — salvo que VERIFICACION_SIMULAR_ENVIO=true
 * (solo desarrollo local), en cuyo caso el código se escribe en el log.
 */
@RestController
@RequestMapping("/api/super-admin/seguridad/contacto")
public class SuperAdminContactoController {

    private static final int MINUTOS_VALIDEZ = EnvioCodigoVerificacionService.MINUTOS_VALIDEZ;
    private static final int MAX_INTENTOS = 5;
    private static final int SEGUNDOS_ENTRE_ENVIOS = 60;

    @Autowired private UsuarioSuperAdminRepository admins;
    @Autowired private VerificacionContactoSuperAdminRepository verificaciones;
    @Autowired private EnvioCodigoVerificacionService envio;
    @Autowired(required = false) private RegistroAuditoriaService auditoria;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public static class SolicitarRequest { public String canal; public String accion; public String valor; public String password; }
    public static class ConfirmarRequest { public Long solicitudId; public String codigoActual; public String codigoNuevo; }

    @PostMapping("/solicitar")
    @Transactional
    public Map<String, Object> solicitar(@RequestBody SolicitarRequest req) {
        UsuarioSuperAdmin admin = adminActual();
        if (req.password == null || !encoder.matches(req.password, admin.getPasswordHash())) {
            throw new RuntimeException("Contraseña incorrecta");
        }
        String canal = normalizar(req.canal, Set.of("EMAIL", "TELEFONO"), "Canal no válido");
        String accion = normalizar(req.accion, Set.of("AGREGAR", "CAMBIAR", "QUITAR"), "Acción no válida");
        String actual = valorActual(admin, canal);

        String nuevo = null;
        if (accion.equals("AGREGAR") && actual != null) throw new RuntimeException("Ya tiene uno registrado; use Cambiar");
        if (!accion.equals("AGREGAR") && actual == null) throw new RuntimeException("No hay ninguno registrado todavía");
        if (!accion.equals("QUITAR")) {
            nuevo = validarValor(canal, req.valor);
            if (nuevo.equals(actual)) throw new RuntimeException("Es el mismo que ya tiene registrado");
        }

        verificaciones.findTopByAdminIdAndCanalOrderByCreadaEnDesc(admin.getId(), canal)
            .filter(ultima -> ultima.getCreadaEn().isAfter(LocalDateTime.now().minusSeconds(SEGUNDOS_ENTRE_ENVIOS)))
            .ifPresent(ultima -> { throw new RuntimeException("Espere un minuto antes de pedir otro código"); });
        for (VerificacionContactoSuperAdmin p : verificaciones.findByAdminIdAndCanalAndEstado(admin.getId(), canal, "PENDIENTE")) {
            p.setEstado("ANULADA");
        }

        VerificacionContactoSuperAdmin v = new VerificacionContactoSuperAdmin();
        v.setAdminId(admin.getId());
        v.setCanal(canal);
        v.setAccion(accion);
        v.setValorNuevo(nuevo);
        v.setExpiraEn(LocalDateTime.now().plusMinutes(MINUTOS_VALIDEZ));

        List<String> destinos = new ArrayList<>();
        boolean simulado = false;
        if (actual != null) {
            String codigo = envio.generarCodigo();
            v.setCodigoActualHash(encoder.encode(codigo));
            simulado |= envio.enviar(canal, actual, codigo, admin.getUsername(), "para autorizar el cambio de sus datos de contacto");
            destinos.add(enmascarar(canal, actual) + " (actual)");
        }
        if (nuevo != null) {
            String codigo = envio.generarCodigo();
            v.setCodigoNuevoHash(encoder.encode(codigo));
            simulado |= envio.enviar(canal, nuevo, codigo, admin.getUsername(), "para verificar este dato de contacto");
            destinos.add(enmascarar(canal, nuevo) + " (nuevo)");
        }
        verificaciones.save(v);

        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("solicitudId", v.getId());
        salida.put("pideCodigoActual", v.getCodigoActualHash() != null);
        salida.put("pideCodigoNuevo", v.getCodigoNuevoHash() != null);
        salida.put("destinos", destinos);
        salida.put("simulado", simulado);
        return salida;
    }

    @PostMapping("/confirmar")
    @Transactional(noRollbackFor = RuntimeException.class)
    public Map<String, Object> confirmar(@RequestBody ConfirmarRequest req) {
        UsuarioSuperAdmin admin = adminActual();
        VerificacionContactoSuperAdmin v = req.solicitudId == null ? null : verificaciones.findById(req.solicitudId).orElse(null);
        if (v == null || !v.getAdminId().equals(admin.getId()) || !"PENDIENTE".equals(v.getEstado())) {
            throw new RuntimeException("La solicitud no existe o ya no está vigente; pida un código nuevo");
        }
        if (v.getExpiraEn().isBefore(LocalDateTime.now())) {
            v.setEstado("ANULADA");
            verificaciones.save(v);
            throw new RuntimeException("El código venció; pida uno nuevo");
        }
        v.setIntentos(v.getIntentos() + 1);
        boolean okActual = v.getCodigoActualHash() == null || coincide(req.codigoActual, v.getCodigoActualHash());
        boolean okNuevo = v.getCodigoNuevoHash() == null || coincide(req.codigoNuevo, v.getCodigoNuevoHash());
        if (!okActual || !okNuevo) {
            int restantes = MAX_INTENTOS - v.getIntentos();
            if (restantes <= 0) v.setEstado("ANULADA");
            verificaciones.save(v);
            throw new RuntimeException(restantes <= 0
                ? "Demasiados intentos; pida un código nuevo"
                : "Código incorrecto. Le quedan " + restantes + " intentos");
        }

        String anterior = valorActual(admin, v.getCanal());
        if ("EMAIL".equals(v.getCanal())) admin.setEmail(v.getValorNuevo());
        else admin.setTelefono(v.getValorNuevo());
        admins.save(admin);
        v.setEstado("COMPLETADA");
        verificaciones.save(v);

        if (auditoria != null) {
            String dato = "EMAIL".equals(v.getCanal()) ? "correo" : "teléfono";
            auditoria.registrar(0L, "SUPER_ADMIN", "CONTACTO_" + v.getAccion() + "_SUPERADMIN", "UsuarioSuperAdmin", admin.getUsername(),
                switch (v.getAccion()) {
                    case "AGREGAR" -> "Agregó " + dato + " " + enmascarar(v.getCanal(), v.getValorNuevo());
                    case "CAMBIAR" -> "Cambió " + dato + " de " + enmascarar(v.getCanal(), anterior) + " a " + enmascarar(v.getCanal(), v.getValorNuevo());
                    default -> "Quitó " + dato + " " + enmascarar(v.getCanal(), anterior);
                });
        }
        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("email", admin.getEmail());
        salida.put("telefono", admin.getTelefono());
        return salida;
    }

    private UsuarioSuperAdmin adminActual() {
        return admins.findByUsername(AuthContext.getUsername())
            .orElseThrow(() -> new RuntimeException("Sesión administrativa no válida"));
    }

    private static String valorActual(UsuarioSuperAdmin admin, String canal) {
        return "EMAIL".equals(canal) ? admin.getEmail() : admin.getTelefono();
    }

    private static String normalizar(String valor, Set<String> permitidos, String error) {
        String v = valor != null ? valor.trim().toUpperCase() : "";
        if (!permitidos.contains(v)) throw new RuntimeException(error);
        return v;
    }

    private static String validarValor(String canal, String valor) {
        String v = valor != null ? valor.trim() : "";
        if ("EMAIL".equals(canal)) {
            v = v.toLowerCase();
            if (!v.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$") || v.length() > 160) throw new RuntimeException("Correo no válido");
        } else {
            v = v.replaceAll("[\\s()-]", "");
            if (!v.matches("^\\+[1-9]\\d{7,14}$")) {
                throw new RuntimeException("Teléfono no válido: use formato internacional, por ejemplo +584141234567");
            }
        }
        return v;
    }

    private boolean coincide(String codigo, String hash) {
        return codigo != null && codigo.trim().matches("\\d{6}") && encoder.matches(codigo.trim(), hash);
    }
}
