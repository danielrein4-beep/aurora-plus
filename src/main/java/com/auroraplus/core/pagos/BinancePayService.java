package com.auroraplus.core.pagos;

import com.auroraplus.core.config.CifradoSimetricoService;
import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Map;

/**
 * Integración con Binance Pay Merchant API (v3) — cada tenant cobra a SU
 * PROPIA cuenta Binance, configurada en su Configuración (ver
 * BinancePayController). Aurora Plus nunca ve ni toca el dinero: solo firma
 * requests en nombre del negocio usando sus propias credenciales.
 *
 * IMPORTANTE (léase antes de activar con un cliente real): este servicio
 * está escrito contra la especificación pública documentada de Binance Pay
 * (esquema de firma HMAC-SHA512, endpoints v3), pero nunca se ha probado
 * contra una cuenta Binance Merchant real porque no existían credenciales
 * al momento de escribirlo. Antes de dejarlo en producción con el primer
 * cliente, hay que hacer una prueba real de punta a punta (crear una orden
 * de un centavo, pagarla, confirmar que el webhook llega y se verifica) —
 * Binance puede haber ajustado detalles desde que se documentó esto.
 */
@Service
public class BinancePayService {

    private static final String BASE_URL = "https://bpay.binanceapi.com";
    private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private static final ObjectMapper JSON = new ObjectMapper();

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private CifradoSimetricoService cifradoSimetricoService;

    public static class CredencialesBinance {
        public String apiKey;
        public String secretKey;
    }

    private CredencialesBinance obtenerCredenciales(Long tenantId) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));
        if (!licencia.isBinancePayActivo() || licencia.getBinancePayApiKey() == null) {
            throw new RuntimeException("Binance Pay no está configurado/activado para este negocio");
        }
        CredencialesBinance c = new CredencialesBinance();
        c.apiKey = licencia.getBinancePayApiKey();
        c.secretKey = cifradoSimetricoService.descifrar(licencia.getBinancePaySecretKeyCifrado());
        return c;
    }

    private String firmar(String secretKey, String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] firma = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(firma).toUpperCase();
        } catch (Exception e) {
            throw new RuntimeException("No se pudo firmar la solicitud a Binance Pay", e);
        }
    }

    private String generarNonce() {
        byte[] bytes = new byte[16];
        new SecureRandom().nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    public static class OrdenBinancePay {
        public String prepayId;
        public String qrcodeLink;
        public String checkoutUrl;
        public String deeplink;
    }

    /**
     * Crea una orden de cobro por el monto indicado (en USDT) — el mesero/
     * cajero muestra el QR o el link al cliente para que pague desde su app
     * Binance. El total NO se marca como cobrado acá: eso solo pasa cuando
     * llega el webhook de confirmación (ver BinancePayController.webhook) y
     * ese, a su vez, cierra la comanda por el MISMO camino de siempre
     * (cerrarComandaMixto) — Binance Pay nunca reemplaza esa lógica.
     */
    public OrdenBinancePay crearOrden(Long tenantId, String merchantTradeNo, java.math.BigDecimal montoUsdt, String descripcion) {
        CredencialesBinance cred = obtenerCredenciales(tenantId);

        Map<String, Object> goods = Map.of(
            "goodsType", "02",
            "goodsCategory", "Z000",
            "referenceGoodsId", merchantTradeNo,
            "goodsName", descripcion
        );
        Map<String, Object> cuerpo = Map.of(
            "env", Map.of("terminalType", "WEB"),
            "merchantTradeNo", merchantTradeNo,
            "orderAmount", montoUsdt,
            "currency", "USDT",
            "goods", goods
        );

        JsonNode respuesta = enviarSolicitud(cred, "/binancepay/openapi/v3/order", cuerpo);
        if (!"SUCCESS".equals(respuesta.path("status").asText())) {
            throw new RuntimeException("Binance Pay rechazó la orden: " + respuesta.path("errorMessage").asText("error desconocido"));
        }
        JsonNode data = respuesta.path("data");
        OrdenBinancePay orden = new OrdenBinancePay();
        orden.prepayId = data.path("prepayId").asText(null);
        orden.qrcodeLink = data.path("qrcodeLink").asText(null);
        orden.checkoutUrl = data.path("checkoutUrl").asText(null);
        orden.deeplink = data.path("deeplink").asText(null);
        return orden;
    }

    private JsonNode enviarSolicitud(CredencialesBinance cred, String path, Object cuerpo) {
        try {
            String timestamp = String.valueOf(System.currentTimeMillis());
            String nonce = generarNonce();
            String cuerpoJson = JSON.writeValueAsString(cuerpo);
            String payload = timestamp + "\n" + nonce + "\n" + cuerpoJson + "\n";
            String firma = firmar(cred.secretKey, payload);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + path))
                .header("Content-Type", "application/json")
                .header("BinancePAY-Timestamp", timestamp)
                .header("BinancePAY-Nonce", nonce)
                .header("BinancePAY-Certificate-SN", cred.apiKey)
                .header("BinancePAY-Signature", firma)
                .POST(HttpRequest.BodyPublishers.ofString(cuerpoJson))
                .build();

            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            return JSON.readTree(response.body());
        } catch (Exception e) {
            throw new RuntimeException("No se pudo contactar a Binance Pay: " + e.getMessage(), e);
        }
    }

    /**
     * Verifica que un webhook realmente vino de Binance (mismo esquema de
     * firma que las solicitudes salientes, pero calculado sobre lo que
     * Binance envía) — sin esto, cualquiera podría llamar al endpoint del
     * webhook fingiendo que una venta se pagó.
     */
    public boolean verificarFirmaWebhook(Long tenantId, String timestamp, String nonce, String cuerpoCrudo, String firmaRecibida) {
        CredencialesBinance cred = obtenerCredenciales(tenantId);
        String payload = timestamp + "\n" + nonce + "\n" + cuerpoCrudo + "\n";
        String firmaCalculada = firmar(cred.secretKey, payload);
        return firmaCalculada.equalsIgnoreCase(firmaRecibida);
    }
}
