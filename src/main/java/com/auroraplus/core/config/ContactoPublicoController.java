package com.auroraplus.core.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Formulario público de "Contáctanos" (ver Nosotros.tsx) — antes solo hacía
 * setEnviado(true) en el frontend sin llamar a ningún lado, así que el
 * mensaje "te contactaremos en 24h" era falso: nada se enviaba nunca.
 */
@RestController
@RequestMapping("/api/public/contacto")
public class ContactoPublicoController {

    @Autowired
    private CorreoService correoService;

    // Buzón del negocio, no un dato del cliente — mientras no tengan dominio propio.
    private static final String DESTINATARIO = "auroraplussoftware@gmail.com";

    public static class ContactoRequest {
        public String nombre;
        public String empresa;
        public String email;
        public String industria;
        public String mensaje;
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> enviar(@RequestBody ContactoRequest req) {
        if (req.nombre == null || req.nombre.isBlank() || req.email == null || req.email.isBlank()) {
            throw new IllegalArgumentException("Nombre y correo son obligatorios");
        }

        String cuerpo = "<h3>Nuevo contacto desde el sitio de Aurora Plus</h3>"
            + "<p><strong>Nombre:</strong> " + escapar(req.nombre) + "</p>"
            + "<p><strong>Empresa:</strong> " + escapar(req.empresa) + "</p>"
            + "<p><strong>Correo:</strong> " + escapar(req.email) + "</p>"
            + "<p><strong>Industria:</strong> " + escapar(req.industria) + "</p>"
            + "<p><strong>Mensaje:</strong><br>" + escapar(req.mensaje).replace("\n", "<br>") + "</p>";

        correoService.enviarHtml(DESTINATARIO, "Nuevo contacto: " + safe(req.nombre), cuerpo);

        return ResponseEntity.ok(Map.of("message", "Mensaje recibido. Te contactaremos pronto."));
    }

    private String safe(String s) {
        return s == null ? "" : s;
    }

    // Evita que texto libre del formulario inyecte HTML/JS dentro del correo del negocio.
    private String escapar(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
