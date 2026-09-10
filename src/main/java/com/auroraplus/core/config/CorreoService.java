package com.auroraplus.core.config;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Envío de correos transaccionales de la plataforma (no específicos de un módulo — para PDFs
 * clínicos ver SaludEmailService). Mismo comportamiento defensivo: si no hay credenciales SMTP
 * configuradas (SMTP_USERNAME/SMTP_PASSWORD), simula el envío con un log en vez de fallar, para
 * que el flujo funcione en desarrollo sin morir por falta de configuración.
 */
@Service
public class CorreoService {

    private static final Logger log = LoggerFactory.getLogger(CorreoService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String smtpUsername;

    @Value("${mail.from.address:notificaciones@auroraplus.app}")
    private String fromAddress;

    @Value("${mail.from.name:Aurora Plus}")
    private String fromName;

    /** @return true si se envió de verdad por SMTP; false si solo se simuló (sin credenciales configuradas). */
    public boolean enviarHtml(String destinatario, String asunto, String cuerpoHtml) {
        if (destinatario == null || destinatario.isBlank()) {
            throw new IllegalArgumentException("El destinatario de correo es obligatorio");
        }

        if (mailSender == null || smtpUsername == null || smtpUsername.isBlank()) {
            log.info("[SIMULACIÓN SMTP] Correo a '{}' | Asunto: '{}' | Cuerpo: {}", destinatario, asunto, cuerpoHtml);
            return false;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(destinatario);
            helper.setSubject(asunto);
            helper.setText(cuerpoHtml, true);
            mailSender.send(message);
            log.info("Correo enviado exitosamente a '{}'", destinatario);
            return true;
        } catch (Exception e) {
            log.error("Error al enviar correo a '{}': {}", destinatario, e.getMessage(), e);
            throw new RuntimeException("Error al enviar correo: " + e.getMessage(), e);
        }
    }
}
