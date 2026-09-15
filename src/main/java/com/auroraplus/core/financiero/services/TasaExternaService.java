package com.auroraplus.core.financiero.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Consulta fuentes públicas de tasa de cambio (BCV oficial y Binance P2P
 * USDT/VES) — ambas son cifras que el negocio no controla ni debería tener
 * que transcribir a mano, a diferencia de una tasa "propia" que sí define el
 * negocio. NUNCA inventa ni recicla un valor: si la fuente no responde,
 * responde con datos incompletos o tarda más de CONNECT_TIMEOUT, se lanza
 * RuntimeException con un mensaje honesto y no se escribe nada en
 * tasas_cambio — la última tasa registrada queda intacta hasta que una
 * consulta exitosa la reemplace.
 *
 * Esta consulta es bajo demanda (el usuario pulsa "Actualizar"), a diferencia
 * de TasaBcvAutomaticaJob (en feature/astra-hero-redesign al momento de
 * escribir esto), que corre sola una vez al día por tenant — son dos caminos
 * de escritura complementarios sobre la misma serie con origen "BCV", no
 * duplicados entre sí.
 */
@Service
public class TasaExternaService {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(8);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(10);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(CONNECT_TIMEOUT)
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Tasa oficial BCV (USD -> VES), tomada de dolarapi.com/v1/dolares/oficial
     * (agregador público que replica el valor publicado en bcv.org.ve).
     */
    public BigDecimal obtenerBcv() {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://ve.dolarapi.com/v1/dolares/oficial"))
                .timeout(REQUEST_TIMEOUT)
                .GET()
                .build();

        JsonNode body = ejecutar(request, "BCV (dolarapi.com)");
        JsonNode promedio = body.get("promedio");
        if (promedio == null || promedio.isNull() || !promedio.isNumber()) {
            throw new RuntimeException("La fuente pública de BCV respondió sin un valor de tasa válido. "
                    + "Se mantiene la última tasa registrada.");
        }
        BigDecimal tasa = promedio.decimalValue();
        if (tasa.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("La fuente pública de BCV devolvió una tasa inválida (" + tasa
                    + "). Se mantiene la última tasa registrada.");
        }
        return tasa;
    }

    /**
     * Tasa Binance P2P (USDT/VES, que el mercado venezolano usa como
     * equivalente de USD/VES): promedio de los anuncios más baratos de venta
     * de USDT en el libro P2P público de Binance, mismo criterio que usan las
     * apps de referencia del mercado paralelo.
     */
    public BigDecimal obtenerBinance() {
        String bodyJson = """
            {"asset":"USDT","fiat":"VES","tradeType":"SELL","page":1,"rows":10,"payTypes":[]}
            """;
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"))
                .timeout(REQUEST_TIMEOUT)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(bodyJson))
                .build();

        JsonNode body = ejecutar(request, "Binance P2P");
        JsonNode data = body.get("data");
        if (data == null || !data.isArray() || data.isEmpty()) {
            throw new RuntimeException("Binance P2P no devolvió anuncios de USDT/VES en este momento. "
                    + "Se mantiene la última tasa registrada.");
        }

        List<BigDecimal> precios = new ArrayList<>();
        for (JsonNode item : data) {
            JsonNode precio = item.path("adv").path("price");
            if (precio != null && precio.isTextual()) {
                try {
                    precios.add(new BigDecimal(precio.asText()));
                } catch (NumberFormatException ignorado) {
                    // Anuncio con precio no parseable: se omite, no se aborta todo el promedio por uno malo.
                }
            }
        }
        if (precios.isEmpty()) {
            throw new RuntimeException("Binance P2P respondió sin precios legibles para USDT/VES. "
                    + "Se mantiene la última tasa registrada.");
        }

        BigDecimal suma = precios.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return suma.divide(BigDecimal.valueOf(precios.size()), 4, RoundingMode.HALF_UP);
    }

    private JsonNode ejecutar(HttpRequest request, String nombreFuente) {
        HttpResponse<String> response;
        try {
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (IOException fallaConexion) {
            throw new RuntimeException("No se pudo conectar con " + nombreFuente
                    + " (" + fallaConexion.getMessage() + "). Se mantiene la última tasa registrada.");
        } catch (InterruptedException interrumpido) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("La consulta a " + nombreFuente + " fue interrumpida. "
                    + "Se mantiene la última tasa registrada.");
        }

        if (response.statusCode() != 200) {
            throw new RuntimeException(nombreFuente + " respondió con un error (HTTP " + response.statusCode()
                    + "). Se mantiene la última tasa registrada.");
        }

        try {
            return objectMapper.readTree(response.body());
        } catch (IOException jsonInvalido) {
            throw new RuntimeException(nombreFuente + " respondió con un formato inesperado. "
                    + "Se mantiene la última tasa registrada.");
        }
    }
}
