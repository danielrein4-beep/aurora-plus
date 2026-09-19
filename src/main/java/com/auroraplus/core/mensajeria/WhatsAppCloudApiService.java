package com.auroraplus.core.mensajeria;

import com.auroraplus.core.config.CifradoSimetricoService;
import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
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
 * Integración con WhatsApp Business Cloud API (Meta) — cada tenant conecta SU
 * PROPIA cuenta de Meta (ver WhatsAppConfigController), configurando su
 * propio phoneNumberId, access token y nombre de plantilla ya aprobada.
 * Aurora Plus no tiene cuenta propia de WhatsApp Business ni la necesita:
 * solo dispara el envío usando las credenciales del negocio.
 *
 * IMPORTANTE (léase antes de activar con un cliente real, mismo criterio que
 * BinancePayService): escrito contra la documentación pública de la Cloud
 * API de Meta (endpoint /messages, mensajes de tipo "template"), pero nunca
 * probado contra una cuenta real porque no existían credenciales al momento
 * de escribirlo. Antes de dejarlo en producción con el primer cliente: (1)
 * confirmar que su plantilla fue APROBADA por Meta (una plantilla en
 * revisión o rechazada hace fallar el envío), y (2) mandar un mensaje de
 * prueba real de punta a punta.
 */
@Service
public class WhatsAppCloudApiService {

    private static final String BASE_URL = "https://graph.facebook.com/v20.0";
    private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private static final ObjectMapper JSON = new ObjectMapper();

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private CifradoSimetricoService cifradoSimetricoService;

    /** true si el tenant configuró Y activó WhatsApp — para que el job de recordatorios sepa si intentar o no. */
    public boolean estaActivoParaTenant(Long tenantId) {
        return licenciaTenantRepository.findByTenantId(tenantId)
            .map(l -> l.isWhatsappActivo() && l.getWhatsappPhoneNumberId() != null
                && l.getWhatsappAccessTokenCifrado() != null && l.getWhatsappPlantillaNombre() != null)
            .orElse(false);
    }

    /**
     * Envía la plantilla ya aprobada del negocio a un número en formato E.164
     * (ej. "584121234567", sin "+" ni espacios — así lo exige la Cloud API).
     * Los parámetros se insertan en orden en el cuerpo de la plantilla (ej.
     * {{1}} = nombre del paciente, {{2}} = fecha, {{3}} = hora).
     */
    public void enviarPlantilla(Long tenantId, String telefonoE164, List<String> parametros) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));
        if (!licencia.isWhatsappActivo() || licencia.getWhatsappPhoneNumberId() == null
                || licencia.getWhatsappAccessTokenCifrado() == null || licencia.getWhatsappPlantillaNombre() == null) {
            throw new RuntimeException("WhatsApp no está configurado/activado para este negocio");
        }
        String accessToken = cifradoSimetricoService.descifrar(licencia.getWhatsappAccessTokenCifrado());

        List<Map<String, String>> parametrosBody = parametros.stream()
            .map(p -> Map.of("type", "text", "text", p))
            .toList();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("messaging_product", "whatsapp");
        body.put("to", telefonoE164);
        body.put("type", "template");
        Map<String, Object> template = new LinkedHashMap<>();
        template.put("name", licencia.getWhatsappPlantillaNombre());
        template.put("language", Map.of("code", "es"));
        template.put("components", List.of(Map.of("type", "body", "parameters", parametrosBody)));
        body.put("template", template);

        try {
            String jsonBody = JSON.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + "/" + licencia.getWhatsappPhoneNumberId() + "/messages"))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8))
                .build();

            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new RuntimeException("WhatsApp Cloud API respondió " + response.statusCode() + ": " + response.body());
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("No se pudo enviar el mensaje de WhatsApp: " + e.getMessage(), e);
        }
    }

    /**
     * Envia un mensaje de texto libre dentro de la ventana de atencion de 24 horas.
     * Utilizado para que la IA responda preguntas de stock, precios y coordenadas de pago.
     */
    public void enviarTexto(Long tenantId, String telefonoE164, String texto) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));
        if (!licencia.isWhatsappActivo() || licencia.getWhatsappPhoneNumberId() == null
                || licencia.getWhatsappAccessTokenCifrado() == null) {
            throw new RuntimeException("WhatsApp no esta configurado/activado para este negocio");
        }
        String accessToken = cifradoSimetricoService.descifrar(licencia.getWhatsappAccessTokenCifrado());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("messaging_product", "whatsapp");
        body.put("recipient_type", "individual");
        body.put("to", telefonoE164);
        body.put("type", "text");
        body.put("text", Map.of("preview_url", false, "body", texto));

        try {
            String jsonBody = JSON.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + "/" + licencia.getWhatsappPhoneNumberId() + "/messages"))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8))
                .build();

            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new RuntimeException("WhatsApp Cloud API respondio " + response.statusCode() + ": " + response.body());
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("No se pudo enviar el mensaje de texto de WhatsApp: " + e.getMessage(), e);
        }
    }
}