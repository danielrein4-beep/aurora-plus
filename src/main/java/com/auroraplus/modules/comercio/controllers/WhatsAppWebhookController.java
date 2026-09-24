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

    /** Secreto de la app de Meta (el mismo para todos los negocios que usan la app de Aurora). */
    @org.springframework.beans.factory.annotation.Value("${WHATSAPP_APP_SECRET:}")
    private String appSecret;

    private volatile boolean avisoSinSecreto;

    private boolean firmaValida(String cuerpo, String firma) {
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new javax.crypto.spec.SecretKeySpec(appSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] h = mac.doFinal(cuerpo.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder esperado = new StringBuilder("sha256=");
            for (byte b : h) esperado.append(String.format("%02x", b));
            return java.security.MessageDigest.isEqual(esperado.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8),
                firma.trim().getBytes(java.nio.charset.StandardCharsets.UTF_8));
        } catch (Exception e) {
            return false;
        }
    }

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
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String firma,
            @RequestBody String payloadJson) {

        // Meta firma cada evento con el secreto de la app. Sin verificarlo, cualquiera podía
        // simular mensajes y hacer que el negocio enviara WhatsApp (con costo) a números ajenos.
        if (appSecret != null && !appSecret.isBlank()) {
            if (firma == null || !firmaValida(payloadJson, firma)) {
                return ResponseEntity.status(401).body("Firma inválida");
            }
        } else if (!avisoSinSecreto) {
            avisoSinSecreto = true;
            org.slf4j.LoggerFactory.getLogger(WhatsAppWebhookController.class)
                .warn("WHATSAPP_APP_SECRET no está configurado: el webhook de WhatsApp acepta eventos sin verificar su firma.");
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

    // La configuración del asistente y el simulador viven en WhatsAppIaConfigController,
    // con sesión: aquí, sin token, cualquiera podía leer o cambiar los de otro negocio.
}
