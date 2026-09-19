package com.auroraplus.modules.comercio.controllers;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.mensajeria.WhatsAppCloudApiService;
import com.auroraplus.modules.comercio.services.AuroraWhatsappIaService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

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

    @Value("${whatsapp.meta.app-secret:}")
    private String metaAppSecret;

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
            return ResponseEntity.status(503).body("Webhook de WhatsApp no configurado");
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
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String firma,
            @RequestBody String payloadJson) {

        if (!firmaValida(payloadJson, firma)) {
            return ResponseEntity.status(401).body("Firma de Meta invalida");
        }

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

    private boolean firmaValida(String payload, String firmaRecibida) {
        if (metaAppSecret == null || metaAppSecret.isBlank() || firmaRecibida == null
                || !firmaRecibida.startsWith("sha256=")) {
            return false;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(metaAppSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            StringBuilder hex = new StringBuilder("sha256=");
            for (byte b : mac.doFinal(payload.getBytes(StandardCharsets.UTF_8))) {
                hex.append(String.format("%02x", b));
            }
            return MessageDigest.isEqual(
                hex.toString().getBytes(StandardCharsets.US_ASCII),
                firmaRecibida.getBytes(StandardCharsets.US_ASCII)
            );
        } catch (Exception e) {
            return false;
        }
    }
}
