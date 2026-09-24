package com.auroraplus.core.pagos;

import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.services.HorecaService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Recibe la confirmación de pago de Binance Pay — un negocio pega esta URL
 * (con su propio tenantId) en el panel de webhooks de SU cuenta Binance
 * Merchant. Nunca cierra nada directo: valida la firma con las credenciales
 * de ESE tenant y, si el pago fue exitoso, cierra la comanda por el MISMO
 * camino de siempre (HorecaService.cerrarComandaMixto) — cero lógica de
 * cierre de venta nueva o distinta a la que ya existía.
 *
 * IMPORTANTE: no probado contra un webhook real de Binance (sin cuenta de
 * prueba disponible al escribir esto) — antes de producción, verificar con
 * un pago real de bajo monto que la firma se valide correctamente.
 */
// Bajo /api/public/** a propósito — es Binance llamando desde fuera, sin
// ningún JWT de Aurora Plus (ver WebConfig: esa ruta ya está excluida de
// TenantInterceptor/LicenciaInterceptor). La seguridad real acá es la firma
// HMAC verificada abajo con las credenciales propias del tenant, no un token.
@RestController
@RequestMapping("/api/public/pagos/binance")
public class BinancePayWebhookController {

    private static final Logger log = LoggerFactory.getLogger(BinancePayWebhookController.class);
    private static final Pattern PATRON_MERCHANT_TRADE_NO = Pattern.compile("^HORECA-(\\d+)-(\\d+)-\\d+$");
    private static final ObjectMapper JSON = new ObjectMapper();

    @Autowired
    private BinancePayService binancePayService;

    @Autowired
    private HorecaService horecaService;

    @PostMapping("/webhook/{tenantId}")
    public ResponseEntity<Map<String, Object>> webhook(
            @PathVariable Long tenantId,
            @RequestHeader(value = "BinancePay-Timestamp", required = false) String timestamp,
            @RequestHeader(value = "BinancePay-Nonce", required = false) String nonce,
            @RequestHeader(value = "BinancePay-Signature", required = false) String firma,
            @RequestBody String cuerpoCrudo) {

        if (timestamp == null || nonce == null || firma == null
                || !binancePayService.verificarFirmaWebhook(tenantId, timestamp, nonce, cuerpoCrudo, firma)) {
            log.warn("Webhook de Binance Pay con firma inválida para tenant {}", tenantId);
            return ResponseEntity.status(401).body(Map.of("returnCode", "FAIL", "returnMessage", "Firma inválida"));
        }

        try {
            JsonNode raiz = JSON.readTree(cuerpoCrudo);
            String bizStatus = raiz.path("bizStatus").asText("");
            if (!"PAY_SUCCESS".equals(bizStatus)) {
                // Otros eventos (ej. orden expirada) — se reconoce igual, sin acción.
                return ResponseEntity.ok(Map.of("returnCode", "SUCCESS", "returnMessage", (Object) null));
            }

            JsonNode data = JSON.readTree(raiz.path("data").asText("{}"));
            String merchantTradeNo = data.path("merchantTradeNo").asText("");
            Matcher m = PATRON_MERCHANT_TRADE_NO.matcher(merchantTradeNo);
            if (!m.matches() || !m.group(1).equals(String.valueOf(tenantId))) {
                log.warn("merchantTradeNo inesperado en webhook de Binance Pay: {}", merchantTradeNo);
                return ResponseEntity.ok(Map.of("returnCode", "SUCCESS", "returnMessage", (Object) null));
            }
            Long comandaId = Long.valueOf(m.group(2));

            try {
                Comanda comanda = horecaService.obtenerComanda(comandaId);
                if (comanda.getEstado() == Comanda.EstadoComanda.ABIERTA) {
                    // Se cobra lo que Binance confirma como pagado, no el total que tenga la comanda
                    // ahora (pudo crecer después de generar la orden). Si no alcanza, cerrarComandaMixto
                    // lo rechaza y la comanda sigue abierta para cobrar la diferencia.
                    String moneda = data.path("currency").asText("");
                    java.math.BigDecimal pagado = data.hasNonNull("totalFee") ? new java.math.BigDecimal(data.path("totalFee").asText()) : null;
                    if (pagado == null || pagado.signum() <= 0 || !java.util.Set.of("USDT", "USDC", "BUSD", "FDUSD", "USD").contains(moneda.toUpperCase())) {
                        log.error("Pago de Binance sin monto o en moneda no soportada ({} {}) para la comanda {}", pagado, moneda, comandaId);
                        return ResponseEntity.ok(Map.of("returnCode", "SUCCESS", "returnMessage", (Object) null));
                    }
                    HorecaService.PagoParcialRequest pago = new HorecaService.PagoParcialRequest();
                    pago.metodoPago = "BILLETERA_DIGITAL";
                    pago.moneda = "USD"; // stablecoin en dólares
                    pago.monto = pagado;
                    horecaService.cerrarComandaMixto(comandaId, tenantId, java.util.List.of(pago), null, "binance-" + merchantTradeNo);
                }
                // Si ya no está ABIERTA, Binance probablemente reintentó el webhook
                // (comportamiento normal) — se reconoce como éxito de todos modos.
            } catch (RuntimeException e) {
                log.error("No se pudo cerrar la comanda {} tras confirmación de Binance Pay: {}", comandaId, e.getMessage());
            }

            return ResponseEntity.ok(Map.of("returnCode", "SUCCESS", "returnMessage", (Object) null));
        } catch (Exception e) {
            log.error("Error procesando webhook de Binance Pay", e);
            return ResponseEntity.ok(Map.of("returnCode", "SUCCESS", "returnMessage", (Object) null));
        }
    }
}
