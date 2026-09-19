package com.auroraplus.modules.comercio.controllers;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.mensajeria.WhatsAppCloudApiService;
import com.auroraplus.modules.comercio.services.AuroraWhatsappIaService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/public/whatsapp")
public class WhatsAppWebhookController {

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private AuroraWhatsappIaService whatsappIaService;

    @Autowired(required = false)
    private WhatsAppCloudApiService whatsAppCloudApiService;

    private static final ObjectMapper JSON = new ObjectMapper();

    /**
     * Verificacion del Webhook exigida por Meta (Hub Challenge).
     */
    @GetMapping("/{tenantId:[0-9]+}/webhook")
    public ResponseEntity<?> verificarWebhook(
            @PathVariable Long tenantId,
            @RequestParam(value = "hub.mode", required = false) String mode,
            @RequestParam(value = "hub.challenge", required = false) String challenge,
            @RequestParam(value = "hub.verify_token", required = false) String token) {

        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId).orElse(null);
        if (licencia == null) {
            return ResponseEntity.status(404).body("Tenant no encontrado");
        }

        String tokenEsperado = licencia.getWhatsappWebhookVerifyToken();
        if (tokenEsperado == null || tokenEsperado.isBlank()) {
            tokenEsperado = "aurora_token_" + tenantId;
        }

        if ("subscribe".equals(mode) && tokenEsperado.equals(token)) {
            return ResponseEntity.ok(challenge);
        }

        return ResponseEntity.status(403).body("Token de verificacion invalido");
    }

    /**
     * Recepcion de eventos y mensajes entrantes de clientes desde Meta Cloud API.
     */
    @PostMapping("/{tenantId:[0-9]+}/webhook")
    public ResponseEntity<?> recibirMensajeMeta(
            @PathVariable Long tenantId,
            @RequestBody String payloadJson) {

        try {
            JsonNode root = JSON.readTree(payloadJson);
            JsonNode entry = root.path("entry");
            if (entry.isArray() && !entry.isEmpty()) {
                JsonNode changes = entry.get(0).path("changes");
                if (changes.isArray() && !changes.isEmpty()) {
                    JsonNode value = changes.get(0).path("value");
                    JsonNode messages = value.path("messages");
                    if (messages.isArray() && !messages.isEmpty()) {
                        JsonNode msg = messages.get(0);
                        String from = msg.path("from").asText();
                        String text = "";
                        if (msg.has("text")) {
                            text = msg.path("text").path("body").asText();
                        }

                        if (!from.isBlank() && !text.isBlank()) {
                            AuroraWhatsappIaService.RespuestaIaDTO resp = 
                                whatsappIaService.procesarMensaje(tenantId, from, text);

                            // Enviar respuesta por Meta Cloud API si esta activo
                            if (whatsAppCloudApiService != null && whatsAppCloudApiService.estaActivoParaTenant(tenantId)) {
                                whatsAppCloudApiService.enviarTexto(tenantId, from, resp.textoRespuesta);
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Meta exige 200 OK para no reintentar infinitamente
        }

        return ResponseEntity.ok("EVENT_RECEIVED");
    }

    public static class SimularMensajeRequest {
        public String mensaje;
        public String telefono;
    }

    /**
     * Simulador interactivo para que el dueño de negocio pruebe como responde la IA.
     */
    @PostMapping("/{tenantId:[0-9]+}/simular")
    public ResponseEntity<?> simularMensajeIa(
            @PathVariable Long tenantId,
            @RequestBody SimularMensajeRequest req) {

        String telf = req.telefono != null && !req.telefono.isBlank() ? req.telefono : "584140000000";
        String msg = req.mensaje != null ? req.mensaje : "";

        AuroraWhatsappIaService.RespuestaIaDTO resp = whatsappIaService.procesarMensaje(tenantId, telf, msg);
        return ResponseEntity.ok(resp);
    }

    public static class ConfigIaRequest {
        public Boolean activa;
        public String saludo;
        public String verifyToken;
    }

    @GetMapping("/{tenantId:[0-9]+}/config")
    public ResponseEntity<?> obtenerConfig(
            @PathVariable Long tenantId,
            @RequestHeader(value = "host", required = false) String host) {

        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId).orElse(null);
        if (licencia == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Tienda no encontrada"));
        }

        String baseUrl = host != null ? "https://" + host : "https://auroraplus.app";
        String webhookUrl = baseUrl + "/api/public/whatsapp/" + tenantId + "/webhook";

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("tenantId", tenantId);
        resp.put("activa", licencia.isWhatsappIaActiva());
        resp.put("saludo", licencia.getWhatsappIaSaludo());
        resp.put("verifyToken", licencia.getWhatsappWebhookVerifyToken() != null ? licencia.getWhatsappWebhookVerifyToken() : "aurora_token_" + tenantId);
        resp.put("webhookUrl", webhookUrl);
        resp.put("telefonoContacto", licencia.getTelefonoContacto());

        return ResponseEntity.ok(resp);
    }

    @PostMapping("/{tenantId:[0-9]+}/config")
    public ResponseEntity<?> guardarConfig(
            @PathVariable Long tenantId,
            @RequestBody ConfigIaRequest req) {

        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId).orElse(null);
        if (licencia == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Tienda no encontrada"));
        }

        if (req.activa != null) licencia.setWhatsappIaActiva(req.activa);
        if (req.saludo != null) licencia.setWhatsappIaSaludo(req.saludo.trim());
        if (req.verifyToken != null && !req.verifyToken.isBlank()) licencia.setWhatsappWebhookVerifyToken(req.verifyToken.trim());
        licenciaTenantRepository.save(licencia);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("activa", licencia.isWhatsappIaActiva());
        resp.put("saludo", licencia.getWhatsappIaSaludo());
        resp.put("verifyToken", licencia.getWhatsappWebhookVerifyToken());

        return ResponseEntity.ok(resp);
    }
}
