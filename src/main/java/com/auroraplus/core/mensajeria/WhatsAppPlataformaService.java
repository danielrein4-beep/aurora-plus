package com.auroraplus.core.mensajeria;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * WhatsApp de la PLATAFORMA (no de un negocio): el número propio de Aurora Plus
 * con el que se envían códigos de verificación al equipo de administración.
 *
 * Meta solo permite enviar códigos fuera de una conversación abierta mediante
 * una plantilla de categoría "Autenticación" aprobada (cuerpo con {{1}} y
 * botón "Copiar código"). Se configura con PLATAFORMA_WHATSAPP_PHONE_NUMBER_ID,
 * PLATAFORMA_WHATSAPP_TOKEN y PLATAFORMA_WHATSAPP_PLANTILLA_CODIGO.
 */
@Service
public class WhatsAppPlataformaService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppPlataformaService.class);
    private static final String BASE_URL = "https://graph.facebook.com/v20.0";
    private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private static final ObjectMapper JSON = new ObjectMapper();

    @Value("${PLATAFORMA_WHATSAPP_PHONE_NUMBER_ID:}")
    private String phoneNumberId;

    @Value("${PLATAFORMA_WHATSAPP_TOKEN:}")
    private String token;

    @Value("${PLATAFORMA_WHATSAPP_PLANTILLA_CODIGO:}")
    private String plantilla;

    public boolean estaConfigurado() {
        return !phoneNumberId.isBlank() && !token.isBlank() && !plantilla.isBlank();
    }

    /** Envía el código con la plantilla de autenticación. Lanza excepción si Meta lo rechaza. */
    public void enviarCodigo(String telefonoE164, String codigo) {
        if (!estaConfigurado()) {
            throw new IllegalStateException("El WhatsApp de la plataforma no está configurado");
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("messaging_product", "whatsapp");
        body.put("to", telefonoE164.replace("+", ""));
        body.put("type", "template");
        body.put("template", Map.of(
            "name", plantilla,
            "language", Map.of("code", "es"),
            "components", List.of(
                Map.of("type", "body", "parameters", List.of(Map.of("type", "text", "text", codigo))),
                Map.of("type", "button", "sub_type", "url", "index", "0",
                    "parameters", List.of(Map.of("type", "text", "text", codigo)))
            )
        ));
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + "/" + phoneNumberId + "/messages"))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(body), StandardCharsets.UTF_8))
                .build();
            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.error("WhatsApp de plataforma respondió {}: {}", response.statusCode(), response.body());
                throw new RuntimeException("No se pudo enviar el código por WhatsApp");
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("No se pudo enviar el código por WhatsApp: " + e.getMessage(), e);
        }
    }
}
