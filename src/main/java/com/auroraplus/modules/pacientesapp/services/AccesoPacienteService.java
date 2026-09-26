package com.auroraplus.modules.pacientesapp.services;

import com.auroraplus.core.auth.services.JwtService;
import com.auroraplus.core.config.EnvioCodigoVerificacionService;
import com.auroraplus.modules.pacientesapp.entities.CodigoAccesoPaciente;
import com.auroraplus.modules.pacientesapp.entities.PacienteApp;
import com.auroraplus.modules.pacientesapp.repositories.CodigoAccesoPacienteRepository;
import com.auroraplus.modules.pacientesapp.repositories.PacienteAppRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;

/**
 * Entrada a la app sin contraseñas: cédula + WhatsApp, y un código de 6 dígitos que
 * llega por el WhatsApp de la plataforma. En desarrollo, con VERIFICACION_SIMULAR_ENVIO=true,
 * el código se escribe en el log del backend (ver EnvioCodigoVerificacionService).
 */
@Service
public class AccesoPacienteService {

    private static final int MAX_INTENTOS = 5;
    private static final int MAX_CODIGOS_15_MIN = 3;

    @Autowired private PacienteAppRepository pacientes;
    @Autowired private CodigoAccesoPacienteRepository codigos;
    @Autowired private EnvioCodigoVerificacionService envio;
    @Autowired private JwtService jwtService;

    @Value("${VERIFICACION_SIMULAR_ENVIO:false}")
    private boolean simularEnvio;

    @Value("${app.frontend.url:http://localhost:8443}")
    private String urlFrontend;

    /**
     * Solo para probar en el computador: con el envío simulado y el backend en localhost,
     * cualquier código de 6 dígitos sirve. En un servidor real nunca se cumple.
     */
    private boolean codigoLibreDePrueba() {
        boolean local = urlFrontend == null || urlFrontend.contains("localhost") || urlFrontend.contains("127.0.0.1");
        return simularEnvio && local;
    }

    public record CodigoEnviado(String enviadoA, boolean simulado) {}
    public record Sesion(String token, PacienteDto paciente) {}
    public record PacienteDto(Long id, String nombre, String cedula, String telefono) {
        static PacienteDto de(PacienteApp p) {
            return new PacienteDto(p.getId(), p.getNombre(), Cedula.conGuion(p.getCedula()), p.getTelefono());
        }
    }

    public CodigoEnviado solicitarCodigo(String cedulaTexto, String telefonoTexto, String nombre, boolean crearCuenta) {
        String cedula = Cedula.normalizar(cedulaTexto);
        String telefono = normalizarTelefono(telefonoTexto);

        if (codigos.countByCedulaAndCreadoEnAfter(cedula, LocalDateTime.now().minusMinutes(15)) >= MAX_CODIGOS_15_MIN) {
            throw new RuntimeException("Pediste varios códigos seguidos. Espera unos minutos e intenta de nuevo");
        }

        PacienteApp existente = pacientes.findByCedula(cedula).orElse(null);
        if (crearCuenta) {
            if (existente != null) throw new RuntimeException("Ya existe una cuenta con esa cédula. Usa la opción Entrar");
            if (nombre == null || nombre.trim().length() < 3) throw new RuntimeException("Escribe tu nombre y apellido");
        } else {
            if (existente == null) throw new RuntimeException("No encontramos una cuenta con esa cédula. Crea una gratis");
            if (!existente.isActivo() || !telefono.equals(existente.getTelefono())) {
                throw new RuntimeException("La cédula y el WhatsApp no coinciden con la cuenta");
            }
        }

        // Un solo código vivo por cédula: los anteriores dejan de servir.
        codigos.findFirstByCedulaAndUsadoFalseOrderByCreadoEnDesc(cedula).ifPresent(c -> { c.setUsado(true); codigos.save(c); });

        String codigo = envio.generarCodigo();
        CodigoAccesoPaciente c = new CodigoAccesoPaciente();
        c.setCedula(cedula);
        c.setTelefono(telefono);
        c.setNombre(crearCuenta ? nombre.trim() : null);
        c.setCodigoHash(hash(codigo));
        c.setExpiraEn(LocalDateTime.now().plusMinutes(EnvioCodigoVerificacionService.MINUTOS_VALIDEZ));
        codigos.save(c);

        // Meta pide el número internacional: 04141234567 -> 584141234567.
        String e164 = telefono.startsWith("0") && telefono.length() == 11 ? "58" + telefono.substring(1) : telefono;
        boolean simulado = envio.enviar("WHATSAPP", e164, codigo, Cedula.conGuion(cedula), "para entrar a Mediclinic Pacientes");
        return new CodigoEnviado(EnvioCodigoVerificacionService.enmascarar("WHATSAPP", telefono), simulado);
    }

    /** Sin @Transactional a propósito: un intento fallido debe quedar guardado aunque se lance el error. */
    public Sesion verificar(String cedulaTexto, String codigo) {
        String cedula = Cedula.normalizar(cedulaTexto);
        CodigoAccesoPaciente c = codigos.findFirstByCedulaAndUsadoFalseOrderByCreadoEnDesc(cedula)
            .orElseThrow(() -> new RuntimeException("Pide un código primero"));
        if (c.getExpiraEn().isBefore(LocalDateTime.now())) {
            c.setUsado(true);
            codigos.save(c);
            throw new RuntimeException("El código venció. Pide uno nuevo");
        }
        String limpio = codigo == null ? "" : codigo.replaceAll("\\D", "");
        boolean aceptadoEnPrueba = codigoLibreDePrueba() && limpio.length() == 6;
        if (!aceptadoEnPrueba && !MessageDigest.isEqual(hash(limpio).getBytes(StandardCharsets.UTF_8), c.getCodigoHash().getBytes(StandardCharsets.UTF_8))) {
            c.setIntentos(c.getIntentos() + 1);
            if (c.getIntentos() >= MAX_INTENTOS) c.setUsado(true);
            codigos.save(c);
            throw new RuntimeException(c.isUsado() ? "Demasiados intentos. Pide un código nuevo" : "El código no es correcto");
        }
        c.setUsado(true);
        codigos.save(c);

        PacienteApp p = pacientes.findByCedula(cedula).orElse(null);
        if (p == null) {
            if (c.getNombre() == null) throw new RuntimeException("No encontramos una cuenta con esa cédula. Crea una gratis");
            p = new PacienteApp();
            p.setCedula(cedula);
            p.setNombre(c.getNombre());
            p.setTelefono(c.getTelefono());
        }
        p.setUltimoAcceso(LocalDateTime.now());
        p = pacientes.save(p);
        return new Sesion(jwtService.generarTokenPaciente(p.getId(), p.getTokenVersion()), PacienteDto.de(p));
    }

    public PacienteDto yo(Long pacienteAppId) {
        return PacienteDto.de(pacientes.findById(pacienteAppId).orElseThrow(() -> new RuntimeException("Cuenta no encontrada")));
    }

    /** Cierra todas las sesiones abiertas de esa cuenta (en todos los teléfonos). */
    public void cerrarSesiones(Long pacienteAppId) {
        pacientes.findById(pacienteAppId).ifPresent(p -> {
            p.setTokenVersion(p.getTokenVersion() + 1);
            pacientes.save(p);
        });
    }

    static String normalizarTelefono(String texto) {
        String d = texto == null ? "" : texto.replaceAll("\\D", "");
        if (d.startsWith("58") && d.length() == 12) d = "0" + d.substring(2);
        if (d.length() == 10 && d.startsWith("4")) d = "0" + d;
        if (d.length() < 10 || d.length() > 13) throw new RuntimeException("El número de WhatsApp no parece válido");
        return d;
    }

    private static String hash(String valor) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(valor.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
