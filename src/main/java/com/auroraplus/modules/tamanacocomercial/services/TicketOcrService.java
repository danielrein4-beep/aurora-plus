package com.auroraplus.modules.tamanacocomercial.services;

import com.auroraplus.modules.tamanacocomercial.dto.TicketExtraidoDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * OCR de tickets de romana vía Gemini. Requiere configurar `gemini.api.key`
 * en application.properties; sin esa clave, lanza IllegalStateException
 * (comportamiento idéntico al original).
 */
@Service
public class TicketOcrService {

    @Value("${gemini.api.key:}")
    private String apiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private static final String MODELO = "gemini-3.6-flash";

    public TicketExtraidoDTO procesarTicket(MultipartFile file) throws Exception {
        String key = (apiKey != null) ? apiKey.trim() : "";
        if (key.isEmpty() || key.equals("TU_API_KEY_AQUI")) {
            throw new IllegalStateException("API Key de Gemini no configurada en application.properties.");
        }

        String base64Image = Base64.getEncoder().encodeToString(file.getBytes());
        String mimeType = (file.getContentType() != null && !file.getContentType().isEmpty())
                ? file.getContentType()
                : "image/jpeg";

        String promptTexto = """
            Analiza este comprobante de romana, pesaje o guía de despacho (manuscrito o impreso).
            Extrae los datos y responde EXCLUSIVAMENTE con un JSON válido con estas claves:
            {
              "fecha": "YYYY-MM-DD",
              "hora": "HH:mm",
              "chofer": "Nombre del chofer",
              "placa": "Placa del camión",
              "mina": "Nombre de la mina u origen",
              "pesoNeto": 11.02,
              "producto": "Carbón",
              "observaciones": ""
            }
            REGLA ESTRICTA: 'pesoNeto' debe ser ÚNICAMENTE el PESO NETO en número decimal (toneladas). Descarta Bruto y Tara.
            """;

        Map<String, Object> inlineData = Map.of("mimeType", mimeType, "data", base64Image);
        Map<String, Object> contentPartImage = Map.of("inlineData", inlineData);
        Map<String, Object> contentPartText = Map.of("text", promptTexto);
        Map<String, Object> content = Map.of("parts", List.of(contentPartImage, contentPartText));
        Map<String, Object> requestBodyMap = Map.of(
                "contents", List.of(content),
                "generationConfig", Map.of("responseMimeType", "application/json", "temperature", 0.1)
        );

        String jsonPayload = objectMapper.writeValueAsString(requestBodyMap);
        String endpointUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + MODELO + ":generateContent?key=" + key;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(endpointUrl))
                .timeout(Duration.ofSeconds(35))
                .header("Content-Type", "application/json")
                .header("X-goog-api-key", key)
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();

        int maxIntentos = 3;
        int intentoActual = 0;
        long tiempoEsperaMs = 1500;

        while (intentoActual < maxIntentos) {
            intentoActual++;
            try {
                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                int statusCode = response.statusCode();

                if (statusCode == 200) {
                    return parsearRespuestaGemini(response.body());
                }

                if (statusCode == 503 || statusCode == 429 || statusCode == 500) {
                    if (intentoActual < maxIntentos) {
                        Thread.sleep(tiempoEsperaMs * intentoActual);
                        continue;
                    } else {
                        throw new RuntimeException("Google AI sigue saturado tras " + maxIntentos + " intentos (HTTP " + statusCode + "): " + response.body());
                    }
                }

                throw new RuntimeException("Error API Gemini (HTTP " + statusCode + "): " + response.body());

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Proceso interrumpido durante el reintento.");
            } catch (IOException e) {
                if (intentoActual >= maxIntentos) {
                    throw new RuntimeException("Error de red tras " + maxIntentos + " intentos: " + e.getMessage(), e);
                }
                try {
                    Thread.sleep(tiempoEsperaMs);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Proceso interrumpido durante la pausa de red.");
                }
            }
        }

        throw new RuntimeException("No fue posible procesar el comprobante tras " + maxIntentos + " intentos.");
    }

    private TicketExtraidoDTO parsearRespuestaGemini(String responseBody) throws Exception {
        JsonNode rootNode = objectMapper.readTree(responseBody);
        JsonNode candidate = rootNode.path("candidates").get(0);
        String rawText = candidate.path("content").path("parts").get(0).path("text").asText();

        String cleanJson = rawText.trim();
        if (cleanJson.startsWith("```json")) cleanJson = cleanJson.substring(7);
        else if (cleanJson.startsWith("```")) cleanJson = cleanJson.substring(3);
        if (cleanJson.endsWith("```")) cleanJson = cleanJson.substring(0, cleanJson.length() - 3);
        cleanJson = cleanJson.trim();

        JsonNode dataNode = objectMapper.readTree(cleanJson);

        BigDecimal peso = BigDecimal.ZERO;
        JsonNode pesoNode = dataNode.has("pesoNeto") ? dataNode.path("pesoNeto") : dataNode.path("peso_neto");
        if (!pesoNode.isMissingNode() && !pesoNode.isNull()) {
            try {
                String strPeso = pesoNode.asText("0.00").replace(",", ".");
                peso = new BigDecimal(strPeso);
            } catch (Exception ignored) {}
        }

        return new TicketExtraidoDTO(
                dataNode.path("fecha").asText(""),
                dataNode.path("hora").asText(""),
                dataNode.path("chofer").asText(""),
                dataNode.path("placa").asText(""),
                dataNode.path("mina").asText(""),
                peso,
                dataNode.path("producto").asText("Carbón"),
                dataNode.path("observaciones").asText("")
        );
    }
}
