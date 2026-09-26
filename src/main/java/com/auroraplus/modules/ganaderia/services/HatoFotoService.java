package com.auroraplus.modules.ganaderia.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.text.Normalizer;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Lee con IA (Gemini) la foto de una libreta, planilla o lista del hato y propone una fila por
 * animal: arete, sexo, categoría, raza, peso y potrero. Es solo una PROPUESTA: el ganadero la
 * revisa y corrige en "Registrar mi ganado" antes de guardar, y el guardado pasa por la misma
 * validación que la importación desde Excel. Mismo patrón que la lectura de facturas.
 */
@Service
public class HatoFotoService {

    private static final Logger log = LoggerFactory.getLogger(HatoFotoService.class);
    private static final long MAX_BYTES = 10L * 1024 * 1024;
    private static final Set<String> HEMBRAS = Set.of("VACA", "NOVILLA", "MAUTA", "BECERRA");
    private static final Set<String> MACHOS = Set.of("TORO", "NOVILLO", "MAUTE", "TERNERO");

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.model:gemini-1.5-flash}")
    private String modelo;

    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public record FilaLeida(String arete, String sexo, String tipoAnimal, String raza, String peso, String potrero) {}

    public List<FilaLeida> leer(MultipartFile foto) throws IOException {
        String key = apiKey != null ? apiKey.trim() : "";
        if (key.isEmpty() || key.equals("TU_API_KEY_AQUI")) {
            throw new RuntimeException("La lectura por foto no está activa en este servidor. Usa la lista o el Excel.");
        }
        if (foto == null || foto.isEmpty()) throw new RuntimeException("Toma o elige una foto de la lista de animales");
        if (foto.getSize() > MAX_BYTES) throw new RuntimeException("La foto pesa más de 10 MB. Tómala de nuevo con menos resolución.");
        String tipo = foto.getContentType() != null ? foto.getContentType() : "";
        if (!tipo.startsWith("image/")) throw new RuntimeException("Solo se aceptan fotos (JPG, PNG o HEIC)");

        String prompt = """
            Esta foto es una libreta, planilla o lista de ganado bovino de una finca en Venezuela
            (puede ser manuscrita). Extrae UN objeto por animal y responde EXCLUSIVAMENTE con JSON:
            {"animales": [{"arete": "V-105", "sexo": "HEMBRA", "categoria": "VACA", "raza": "Brahman", "peso": "420", "potrero": "La Vega"}]}
            Reglas:
            - arete: el número o código del animal tal como aparece.
            - sexo: "HEMBRA" o "MACHO"; deducelo de la categoría si no está escrito (vaca/novilla/mauta/becerra = HEMBRA; toro/novillo/maute/ternero/becerro = MACHO).
            - categoria: una de VACA, NOVILLA, MAUTA, BECERRA, TORO, NOVILLO, MAUTE, TERNERO.
            - peso en kilos solo con números.
            - Si un dato no aparece, usa "". Nunca inventes animales ni datos que no estén en la foto.
            """;

        Map<String, Object> cuerpo = Map.of(
            "contents", List.of(Map.of("parts", List.of(
                Map.of("inlineData", Map.of("mimeType", tipo, "data", Base64.getEncoder().encodeToString(foto.getBytes()))),
                Map.of("text", prompt)))),
            "generationConfig", Map.of("responseMimeType", "application/json", "temperature", 0.1));

        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/" + modelo + ":generateContent"))
            .timeout(Duration.ofSeconds(45))
            .header("Content-Type", "application/json")
            .header("X-goog-api-key", key)
            .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(cuerpo)))
            .build();

        for (int intento = 1; intento <= 3; intento++) {
            try {
                HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
                if (resp.statusCode() == 200) return interpretar(resp.body());
                if ((resp.statusCode() == 429 || resp.statusCode() >= 500) && intento < 3) {
                    Thread.sleep(1500L * intento);
                    continue;
                }
                log.error("Lectura de hato por foto: Gemini respondió HTTP {}: {}", resp.statusCode(), resp.body());
                throw new RuntimeException("No se pudo leer la foto en este momento. Intenta de nuevo en unos minutos.");
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Se interrumpió la lectura de la foto");
            } catch (IOException e) {
                if (intento == 3) throw new RuntimeException("No hay conexión con el servicio de lectura. Revisa el internet e intenta de nuevo.");
            }
        }
        throw new RuntimeException("No se pudo leer la foto");
    }

    private List<FilaLeida> interpretar(String cuerpo) throws IOException {
        String texto = mapper.readTree(cuerpo).path("candidates").path(0).path("content").path("parts").path(0).path("text").asText("");
        JsonNode raiz = mapper.readTree(texto.isBlank() ? "{}" : texto);
        JsonNode lista = raiz.isArray() ? raiz : raiz.path("animales");
        List<FilaLeida> filas = new ArrayList<>();
        for (JsonNode a : lista) {
            String arete = txt(a, "arete");
            if (arete.isEmpty()) continue;
            String categoria = sinTildes(txt(a, "categoria")).toUpperCase(Locale.ROOT);
            if (categoria.equals("BECERRO")) categoria = "TERNERO";
            String sexo = sinTildes(txt(a, "sexo")).toUpperCase(Locale.ROOT);
            if (sexo.startsWith("H")) sexo = "HEMBRA";
            else if (sexo.startsWith("M")) sexo = "MACHO";
            else sexo = HEMBRAS.contains(categoria) ? "HEMBRA" : MACHOS.contains(categoria) ? "MACHO" : "";
            if (!HEMBRAS.contains(categoria) && !MACHOS.contains(categoria)) categoria = "";
            if (!categoria.isEmpty() && !sexo.isEmpty() && (sexo.equals("HEMBRA") != HEMBRAS.contains(categoria))) categoria = "";
            String peso = txt(a, "peso").replaceAll("[^0-9.,]", "").replace(',', '.');
            filas.add(new FilaLeida(arete, sexo, categoria, txt(a, "raza"), peso, txt(a, "potrero")));
            if (filas.size() >= 500) break;
        }
        return filas;
    }

    private static String txt(JsonNode n, String campo) {
        JsonNode v = n.path(campo);
        return v.isMissingNode() || v.isNull() ? "" : v.asText("").trim();
    }

    private static String sinTildes(String t) {
        return Normalizer.normalize(t, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }
}
