package com.auroraplus.core.financiero.services;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Lee la tasa USD->VES directo de las dos fuentes reales que se usan en la
 * calle en Venezuela — no un valor inventado ni tecleado a mano:
 *
 *  - Binance P2P: promedio de las mejores ofertas de venta de USDT/VES
 *    (endpoint público no oficial que usa la propia web de Binance P2P).
 *  - BCV: tasa oficial publicada en bcv.org.ve, scrapeada del HTML porque
 *    el Banco Central no expone ninguna API.
 *
 * Ambos métodos devuelven Optional.empty() (nunca lanzan) si la fuente
 * externa falla — un corte de red o un cambio de maquetación en cualquiera
 * de los dos sitios no debe tumbar el job que los llama (ver
 * ActualizacionTasasAutomaticasJob), simplemente esa corrida no actualiza
 * nada y se reintenta en la próxima.
 */
@Service
public class TasaCambioAutomaticaService {

    private static final Logger log = LoggerFactory.getLogger(TasaCambioAutomaticaService.class);

    private static final String BINANCE_P2P_URL = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search";
    private static final String BCV_URL = "https://www.bcv.org.ve";

    @SuppressWarnings("unchecked")
    public Optional<BigDecimal> obtenerTasaBinanceP2P() {
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // tradeType=SELL desde la perspectiva del comprador: son las ofertas de
            // gente que YA TIENE USDT y lo vende por VES — el precio que de verdad
            // recibiría un negocio que cobra en USDT y necesita convertir a bolívares.
            // Map.of() no acepta valores null (revienta con NullPointerException al
            // construirlo) y Binance sí espera "publisherType": null explícito en el
            // body — por eso un LinkedHashMap mutable en vez de Map.of().
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("asset", "USDT");
            body.put("fiat", "VES");
            body.put("merchantCheck", false);
            body.put("page", 1);
            body.put("payTypes", List.of());
            body.put("publisherType", null);
            body.put("rows", 5);
            body.put("tradeType", "SELL");

            ResponseEntity<Map> respuesta = restTemplate.postForEntity(
                BINANCE_P2P_URL, new HttpEntity<>(body, headers), Map.class);

            Map<String, Object> payload = respuesta.getBody();
            if (payload == null) return Optional.empty();
            List<Map<String, Object>> anuncios = (List<Map<String, Object>>) payload.get("data");
            if (anuncios == null || anuncios.isEmpty()) return Optional.empty();

            BigDecimal suma = BigDecimal.ZERO;
            int cantidad = 0;
            for (Map<String, Object> anuncio : anuncios) {
                Map<String, Object> adv = (Map<String, Object>) anuncio.get("adv");
                if (adv == null) continue;
                Object precio = adv.get("price");
                if (precio == null) continue;
                suma = suma.add(new BigDecimal(String.valueOf(precio)));
                cantidad++;
            }
            if (cantidad == 0) return Optional.empty();

            BigDecimal promedio = suma.divide(BigDecimal.valueOf(cantidad), 4, RoundingMode.HALF_UP);
            log.info("Tasa Binance P2P (USDT/VES) obtenida: {} (promedio de {} anuncios)", promedio, cantidad);
            return Optional.of(promedio);
        } catch (Exception e) {
            log.error("No se pudo obtener la tasa de Binance P2P: {}", e.getMessage(), e);
            return Optional.empty();
        }
    }

    public Optional<BigDecimal> obtenerTasaBcv() {
        try {
            Document doc = Jsoup.connect(BCV_URL)
                .sslSocketFactory(confiarEnCualquierCertificado())
                .timeout(15000)
                .userAgent("Mozilla/5.0 (AuroraPlus tasa-automatica)")
                .get();

            // El BCV no tiene API — el dólar oficial del día viene embebido en este
            // <strong> específico dentro del bloque #dolar de su propia portada.
            String texto = doc.select("#dolar strong.strong-tb").text().trim();
            if (texto.isEmpty()) {
                log.warn("No se encontró el valor del dólar en la portada del BCV (¿cambió la maquetación del sitio?)");
                return Optional.empty();
            }

            // Formato venezolano: coma decimal, sin separador de miles en el valor típico
            // (ej. "848,54580000") — se quita cualquier punto de miles antes de normalizar.
            String normalizado = texto.replace(".", "").replace(",", ".");
            BigDecimal tasa = new BigDecimal(normalizado);
            log.info("Tasa BCV oficial (USD/VES) obtenida: {}", tasa);
            return Optional.of(tasa);
        } catch (Exception e) {
            log.error("No se pudo obtener la tasa oficial del BCV: {}", e.getMessage(), e);
            return Optional.empty();
        }
    }

    /**
     * El sitio del BCV tiene un certificado que las cadenas de confianza estándar de Java
     * no siempre validan (problema conocido y de larga data del propio bcv.org.ve, no de
     * Aurora). Se relaja la verificación SOLO para esta conexión puntual a este dominio
     * público específico — nunca se toca la configuración TLS global de la aplicación.
     */
    private SSLSocketFactory confiarEnCualquierCertificado() throws Exception {
        TrustManager[] confiarEnTodos = new TrustManager[]{
            new X509TrustManager() {
                public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
                public void checkClientTrusted(X509Certificate[] certs, String authType) {}
                public void checkServerTrusted(X509Certificate[] certs, String authType) {}
            }
        };
        SSLContext sslContext = SSLContext.getInstance("TLS");
        sslContext.init(null, confiarEnTodos, new SecureRandom());
        return sslContext.getSocketFactory();
    }
}
