package com.auroraplus.core.ocr.services;

import com.auroraplus.core.ocr.dto.FacturaExtraidaDTO;
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
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * OCR genérico de facturas de proveedor (Compras y Gestión de Proveedores):
 * el admin sube una foto de la factura y el sistema lee ítems, precios y
 * proveedor sin transcribir nada a mano — el mismo patrón que
 * tamanacocomercial.TicketOcrService (que está fijo al esquema de un ticket
 * de romana), pero generalizado a cualquier factura de compra de insumos, sin
 * atarse a un vertical. Requiere `gemini.api.key` en application.properties
 * (compartida con TicketOcrService) — sin ella, lanza IllegalStateException
 * con un mensaje claro de configuración faltante, igual que el servicio original.
 * El resultado es solo una PROPUESTA para que el usuario revise antes de
 * confirmar — nunca se registra la compra automáticamente desde el OCR.
 */
@Service
public class FacturaOcrService {

    @Value("${gemini.api.key:}")
    private String apiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private static final String MODELO = "gemini-3.6-flash";

    public FacturaExtraidaDTO procesarFactura(MultipartFile file) throws Exception {
        String key = (apiKey != null) ? apiKey.trim() : "";
        if (key.isEmpty() || key.equals("TU_API_KEY_AQUI")) {
            throw new IllegalStateException("API Key de Gemini no configurada en application.properties (gemini.api.key).");
        }

        String base64Imagen = Base64.getEncoder().encodeToString(file.getBytes());
        String mimeType = (file.getContentType() != null && !file.getContentType().isEmpty())
                ? file.getContentType()
                : "image/jpeg";

        String promptTexto = """
            Analiza esta factura o nota de entrega de un proveedor (manuscrita o impresa).
            Extrae los datos y responde EXCLUSIVAMENTE con un JSON válido con esta forma:
            {
              "numeroFactura": "F-00123",
              "proveedor": "Nombre del proveedor",
              "fecha": "YYYY-MM-DD",
              "items": [
                {"descripcion": "Nombre del producto/insumo", "cantidad": 10.5, "precioUnitario": 2.30}
              ],
              "total": 24.15
            }
            REGLA ESTRICTA: cantidad y precioUnitario deben ser números decimales, nunca texto.
            Si un dato no aparece en la imagen, usa cadena vacía "" (o [] para items) — nunca inventes valores.
            """;

        Map<String, Object> inlineData = Map.of("mimeType", mimeType, "data", base64Imagen);
        Map<String, Object> contentPartImagen = Map.of("inlineData", inlineData);
        Map<String, Object> contentPartTexto = Map.of("text", promptTexto);
        Map<String, Object> content = Map.of("parts", List.of(contentPartImagen, contentPartTexto));
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

        throw new RuntimeException("No fue posible procesar la factura tras " + maxIntentos + " intentos.");
    }

    private FacturaExtraidaDTO parsearRespuestaGemini(String responseBody) throws Exception {
        JsonNode rootNode = objectMapper.readTree(responseBody);
        JsonNode candidate = rootNode.path("candidates").get(0);
        String rawText = candidate.path("content").path("parts").get(0).path("text").asText();

        String cleanJson = rawText.trim();
        if (cleanJson.startsWith("```json")) cleanJson = cleanJson.substring(7);
        else if (cleanJson.startsWith("```")) cleanJson = cleanJson.substring(3);
        if (cleanJson.endsWith("```")) cleanJson = cleanJson.substring(0, cleanJson.length() - 3);
        cleanJson = cleanJson.trim();

        JsonNode dataNode = objectMapper.readTree(cleanJson);

        FacturaExtraidaDTO dto = new FacturaExtraidaDTO();
        dto.setNumeroFactura(dataNode.path("numeroFactura").asText(""));
        dto.setProveedor(dataNode.path("proveedor").asText(""));
        dto.setFecha(dataNode.path("fecha").asText(""));
        dto.setTotal(parsearDecimal(dataNode.path("total")));

        List<FacturaExtraidaDTO.ItemExtraidoDTO> items = new ArrayList<>();
        JsonNode itemsNode = dataNode.path("items");
        if (itemsNode.isArray()) {
            for (JsonNode itemNode : itemsNode) {
                FacturaExtraidaDTO.ItemExtraidoDTO item = new FacturaExtraidaDTO.ItemExtraidoDTO();
                item.setDescripcion(itemNode.path("descripcion").asText(""));
                item.setCantidad(parsearDecimal(itemNode.path("cantidad")));
                item.setPrecioUnitario(parsearDecimal(itemNode.path("precioUnitario")));
                items.add(item);
            }
        }
        dto.setItems(items);

        return dto;
    }

    private BigDecimal parsearDecimal(JsonNode node) {
        if (node.isMissingNode() || node.isNull()) return BigDecimal.ZERO;
        try {
            return new BigDecimal(node.asText("0").replace(",", "."));
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }
}
