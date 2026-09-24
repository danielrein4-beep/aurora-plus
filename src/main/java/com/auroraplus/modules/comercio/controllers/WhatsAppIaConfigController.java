package com.auroraplus.modules.comercio.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.modules.comercio.services.AuroraWhatsappIaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Configuración y simulador del asistente de WhatsApp de un negocio. Antes
 * vivían bajo /api/public/whatsapp/{tenantId}, sin token: cualquiera podía leer
 * el token de verificación, el teléfono y el domicilio de otro negocio, o
 * apagarle el bot. Ahora el negocio sale siempre de la sesión.
 */
@RestController
@RequestMapping("/api/comercio/whatsapp-ia")
public class WhatsAppIaConfigController {

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private AuroraWhatsappIaService whatsappIaService;

    public static class SimularMensajeRequest {
        public String mensaje;
        public String telefono;
    }

    /** Simulador para que el dueño pruebe cómo responde la IA. */
    @PostMapping("/simular")
    public ResponseEntity<?> simular(@RequestBody SimularMensajeRequest req) {
        Long tenantId = tenantActual();
        String telf = req.telefono != null && !req.telefono.isBlank() ? req.telefono : "584140000000";
        String msg = req.mensaje != null ? req.mensaje : "";
        return ResponseEntity.ok(whatsappIaService.procesarMensaje(tenantId, telf, msg));
    }

    public static class ConfigIaRequest {
        public Boolean activa;
        public String saludo;
        public String verifyToken;
        public String politicaDelivery;
        public String zonasDelivery;
    }

    @GetMapping("/config")
    public ResponseEntity<?> obtenerConfig(@RequestHeader(value = "host", required = false) String host) {
        Long tenantId = tenantActual();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId).orElse(null);
        if (licencia == null) return ResponseEntity.status(404).body(Map.of("error", "Negocio no encontrado"));

        String baseUrl = host != null ? "https://" + host : "https://auroraplus.app";
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("tenantId", tenantId);
        resp.put("activa", licencia.isWhatsappIaActiva());
        resp.put("saludo", licencia.getWhatsappIaSaludo());
        resp.put("verifyToken", licencia.getWhatsappWebhookVerifyToken() != null ? licencia.getWhatsappWebhookVerifyToken() : "aurora_token_" + tenantId);
        resp.put("webhookUrl", baseUrl + "/api/public/whatsapp/" + tenantId + "/webhook");
        resp.put("telefonoContacto", licencia.getTelefonoContacto());
        resp.put("politicaDelivery", licencia.getWhatsappIaPoliticaDelivery());
        resp.put("zonasDelivery", licencia.getWhatsappIaZonasDelivery());
        resp.put("domicilioFiscal", licencia.getDomicilioFiscal());
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/config")
    public ResponseEntity<?> guardarConfig(@RequestBody ConfigIaRequest req) {
        AuthContext.exigirRol("DUENO_ADMIN");
        Long tenantId = tenantActual();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId).orElse(null);
        if (licencia == null) return ResponseEntity.status(404).body(Map.of("error", "Negocio no encontrado"));

        if (req.activa != null) licencia.setWhatsappIaActiva(req.activa);
        if (req.saludo != null) licencia.setWhatsappIaSaludo(req.saludo.trim());
        if (req.verifyToken != null && !req.verifyToken.isBlank()) licencia.setWhatsappWebhookVerifyToken(req.verifyToken.trim());
        if (req.politicaDelivery != null) licencia.setWhatsappIaPoliticaDelivery(req.politicaDelivery.trim());
        if (req.zonasDelivery != null) licencia.setWhatsappIaZonasDelivery(req.zonasDelivery.trim());
        licenciaTenantRepository.save(licencia);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("activa", licencia.isWhatsappIaActiva());
        resp.put("saludo", licencia.getWhatsappIaSaludo());
        resp.put("verifyToken", licencia.getWhatsappWebhookVerifyToken());
        resp.put("politicaDelivery", licencia.getWhatsappIaPoliticaDelivery());
        resp.put("zonasDelivery", licencia.getWhatsappIaZonasDelivery());
        return ResponseEntity.ok(resp);
    }

    private Long tenantActual() {
        Long t = TenantContext.getCurrentTenant();
        if (t == null) throw new RuntimeException("Sesión sin negocio");
        return t;
    }
}
