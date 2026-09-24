package com.auroraplus.core.config;

import com.auroraplus.core.mensajeria.WhatsAppPlataformaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;

/**
 * Envía códigos de verificación de 6 dígitos al equipo de administración, por
 * correo (SMTP) o por el WhatsApp de la plataforma.
 *
 * Si el canal no está configurado el envío falla con un mensaje claro, salvo
 * con VERIFICACION_SIMULAR_ENVIO=true (solo desarrollo local): ahí el código se
 * escribe en el log y se informa como simulado.
 */
@Service
public class EnvioCodigoVerificacionService {

    private static final Logger log = LoggerFactory.getLogger(EnvioCodigoVerificacionService.class);
    public static final int MINUTOS_VALIDEZ = 10;

    @Autowired private CorreoService correoService;
    @Autowired private WhatsAppPlataformaService whatsApp;

    @Value("${VERIFICACION_SIMULAR_ENVIO:false}")
    private boolean simularEnvio;

    private final SecureRandom random = new SecureRandom();

    public String generarCodigo() {
        return String.format("%06d", random.nextInt(1_000_000));
    }

    /**
     * @param motivo frase que completa "Su código ... es:" (p. ej. "para recuperar su contraseña").
     * @return true si el envío fue simulado (solo desarrollo).
     */
    public boolean enviar(String canal, String destino, String codigo, String username, String motivo) {
        if ("EMAIL".equals(canal)) {
            if (!correoService.estaConfigurado()) return simularOFallar("correo", destino, codigo);
            correoService.enviarHtml(destino, "Código de verificación de Aurora Plus",
                "<p>Su código " + motivo + " en la cuenta de administración <b>" + username + "</b> es:</p>"
                    + "<p style=\"font-size:28px;font-weight:bold;letter-spacing:6px\">" + codigo + "</p>"
                    + "<p>Vence en " + MINUTOS_VALIDEZ + " minutos. Si usted no lo pidió, ignore este mensaje y avise al propietario de la plataforma.</p>");
        } else {
            if (!whatsApp.estaConfigurado()) return simularOFallar("WhatsApp", destino, codigo);
            whatsApp.enviarCodigo(destino, codigo);
        }
        return false;
    }

    private boolean simularOFallar(String medio, String destino, String codigo) {
        if (!simularEnvio) {
            throw new RuntimeException("El envío por " + medio + " no está configurado en el servidor");
        }
        log.warn("[SIMULACIÓN] Código de verificación por {} para {}: {}", medio, destino, codigo);
        return true;
    }

    public static String enmascarar(String canal, String valor) {
        if (valor == null) return "-";
        if ("EMAIL".equals(canal)) {
            int arroba = valor.indexOf('@');
            String usuario = valor.substring(0, arroba);
            return usuario.substring(0, Math.min(2, usuario.length())) + "***" + valor.substring(arroba);
        }
        return valor.substring(0, Math.min(3, valor.length())) + " *** " + valor.substring(Math.max(0, valor.length() - 4));
    }
}
