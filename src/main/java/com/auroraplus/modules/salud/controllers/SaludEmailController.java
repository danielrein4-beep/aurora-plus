package com.auroraplus.modules.salud.controllers;

import com.auroraplus.modules.salud.services.SaludEmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/salud/documentos")
public class SaludEmailController {

    @Autowired
    private SaludEmailService saludEmailService;

    public static class EnviarEmailRequest {
        public String destinatario;
        public String asunto;
        public String cuerpo;
        public String pdfBase64;
        public String nombreArchivo;
    }

    @PostMapping("/enviar-email")
    public ResponseEntity<?> enviarEmailConPdf(@RequestBody EnviarEmailRequest request) {
        if (request == null || request.destinatario == null || request.destinatario.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El correo destinatario es requerido"));
        }

        try {
            boolean enviado = saludEmailService.enviarDocumentoPdf(
                    request.destinatario.trim(),
                    request.asunto,
                    request.cuerpo,
                    request.pdfBase64,
                    request.nombreArchivo
            );
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "mensaje", "Documento enviado exitosamente a " + request.destinatario.trim()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "No se pudo enviar el correo: " + e.getMessage()
            ));
        }
    }
}
