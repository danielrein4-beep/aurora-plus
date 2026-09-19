package com.auroraplus.modules.comercio;

import com.auroraplus.modules.comercio.controllers.WhatsAppWebhookController;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;

class WhatsAppWebhookSecurityTest {

    @Test
    void rechazaWebhookSinFirma() {
        WhatsAppWebhookController controller = controllerConSecreto("secreto-prueba");
        assertEquals(401, controller.recibirMensajeMeta(1L, null, "{}").getStatusCode().value());
    }

    @Test
    void rechazaWebhookConFirmaFalsa() {
        WhatsAppWebhookController controller = controllerConSecreto("secreto-prueba");
        assertEquals(401, controller.recibirMensajeMeta(1L, "sha256=incorrecta", "{}").getStatusCode().value());
    }

    @Test
    void aceptaFirmaHmacValida() throws Exception {
        String secreto = "secreto-prueba";
        String payload = "{}";
        WhatsAppWebhookController controller = controllerConSecreto(secreto);

        ResponseEntity<?> respuesta = controller.recibirMensajeMeta(1L, firmar(secreto, payload), payload);
        assertEquals(200, respuesta.getStatusCode().value());
    }

    private WhatsAppWebhookController controllerConSecreto(String secreto) {
        WhatsAppWebhookController controller = new WhatsAppWebhookController();
        ReflectionTestUtils.setField(controller, "metaAppSecret", secreto);
        return controller;
    }

    private String firmar(String secreto, String payload) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secreto.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        StringBuilder firma = new StringBuilder("sha256=");
        for (byte b : mac.doFinal(payload.getBytes(StandardCharsets.UTF_8))) {
            firma.append(String.format("%02x", b));
        }
        return firma.toString();
    }
}
