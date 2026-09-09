package com.auroraplus.modules.salud.services;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.Base64;

@Service
public class SaludEmailService {

    private static final Logger log = LoggerFactory.getLogger(SaludEmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String smtpUsername;

    @Value("${mail.from.address:notificaciones@auroraplus.app}")
    private String fromAddress;

    @Value("${mail.from.name:MediClinic Pro}")
    private String fromName;

    /**
     * Envía un correo con el documento PDF adjunto directamente al paciente.
     * Si no hay credenciales SMTP configuradas en local, simula el envío y registra el log.
     */
    public boolean enviarDocumentoPdf(String destinatario, String asunto, String cuerpoHtml, String pdfBase64, String nombreArchivo) {
        if (destinatario == null || destinatario.isBlank()) {
            throw new IllegalArgumentException("El destinatario de correo es obligatorio");
        }

        byte[] pdfBytes = null;
        if (pdfBase64 != null && !pdfBase64.isBlank()) {
            try {
                String cleanBase64 = pdfBase64;
                if (cleanBase64.contains(",")) {
                    cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
                }
                pdfBytes = Base64.getDecoder().decode(cleanBase64.trim());
            } catch (Exception e) {
                log.warn("No se pudo decodificar el PDF adjunto: {}", e.getMessage());
            }
        }

        String filename = (nombreArchivo != null && !nombreArchivo.isBlank()) ? nombreArchivo : "Documento_Medico.pdf";
        if (!filename.toLowerCase().endsWith(".pdf")) {
            filename += ".pdf";
        }

        if (mailSender == null || smtpUsername == null || smtpUsername.isBlank()) {
            log.info("[SIMULACIÓN SMTP] Envío de documento médico a '{}' | Asunto: '{}' | Adjunto: '{}' ({} bytes)",
                    destinatario, asunto, filename, pdfBytes != null ? pdfBytes.length : 0);
            return true;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress, fromName);
            helper.setTo(destinatario);
            helper.setSubject(asunto != null ? asunto : "Documento Médico - MediClinic Pro");
            helper.setText(cuerpoHtml != null ? cuerpoHtml : "Adjuntamos su documento médico oficial.", true);

            if (pdfBytes != null && pdfBytes.length > 0) {
                helper.addAttachment(filename, new ByteArrayResource(pdfBytes), "application/pdf");
            }

            mailSender.send(message);
            log.info("Correo médico enviado exitosamente a '{}' con adjunto '{}'", destinatario, filename);
            return true;
        } catch (Exception e) {
            log.error("Error al enviar correo electrónico vía SMTP a '{}': {}", destinatario, e.getMessage(), e);
            throw new RuntimeException("Error al enviar correo: " + e.getMessage(), e);
        }
    }
}
