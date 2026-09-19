package com.auroraplus.modules.comercio.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.modules.comercio.services.AuroraWhatsappIaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/** Configuracion y simulacion privadas del asistente de WhatsApp. */
@RestController
@RequestMapping("/api/comercio/whatsapp-ia")
public class WhatsAppIaConfigController {

    private static final SecureRandom RANDOM = new SecureRandom();

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private AuroraWhatsappIaService whatsappIaService;

    public static class SimularMensajeRequest {
        public String mensaje;
        public String telefono;
    }

    public static class ConfigIaRequest {
        public Boolean activa;
        public String saludo;
        public String verifyToken;
        public String politicaDelivery;
        public String zonasDelivery;
    }

    @PostMapping("/simular")
    public ResponseEntity<?> simular(@RequestBody SimularMensajeRequest req) {
        Long tenantId = tenantActual();
        String telefono = req.telefono != null && !req.telefono.isBlank() ? req.telefono : "584140000000";
        String mensaje = req.mensaje != null ? req.mensaje : "";
        return ResponseEntity.ok(whatsappIaService.procesarMensaje(tenantId, telefono, mensaje));
    }

    @GetMapping("/config")
    public ResponseEntity<?> obtenerConfig(@RequestHeader(value = "host", required = false) String host) {
        AuthContext.exigirRol("DUENO_ADMIN");
        Long tenantId = tenantActual();
        LicenciaTenant licencia = licencia(tenantId);
        String baseUrl = host != null ? "https://" + host : "https://auroraplus.app";

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("tenantId", tenantId);
        respuesta.put("activa", licencia.isWhatsappIaActiva());
        respuesta.put("saludo", licencia.getWhatsappIaSaludo());
        respuesta.put("verifyToken", licencia.getWhatsappWebhookVerifyToken());
        respuesta.put("webhookUrl", baseUrl + "/api/public/whatsapp/" + tenantId + "/webhook");
        respuesta.put("telefonoContacto", licencia.getTelefonoContacto());
        respuesta.put("politicaDelivery", licencia.getWhatsappIaPoliticaDelivery());
        respuesta.put("zonasDelivery", licencia.getWhatsappIaZonasDelivery());
        respuesta.put("domicilioFiscal", licencia.getDomicilioFiscal());
        return ResponseEntity.ok(respuesta);
    }

    @PutMapping("/config")
    public ResponseEntity<?> guardarConfig(@RequestBody ConfigIaRequest req) {
        AuthContext.exigirRol("DUENO_ADMIN");
        LicenciaTenant licencia = licencia(tenantActual());

        if (req.activa != null) licencia.setWhatsappIaActiva(req.activa);
        if (req.saludo != null) licencia.setWhatsappIaSaludo(req.saludo.trim());
        if (req.verifyToken != null && !req.verifyToken.isBlank()) {
            licencia.setWhatsappWebhookVerifyToken(req.verifyToken.trim());
        } else if (licencia.getWhatsappWebhookVerifyToken() == null || licencia.getWhatsappWebhookVerifyToken().isBlank()) {
            byte[] bytes = new byte[32];
            RANDOM.nextBytes(bytes);
            licencia.setWhatsappWebhookVerifyToken(Base64.getUrlEncoder().withoutPadding().encodeToString(bytes));
        }
        if (req.politicaDelivery != null) licencia.setWhatsappIaPoliticaDelivery(req.politicaDelivery.trim());
        if (req.zonasDelivery != null) licencia.setWhatsappIaZonasDelivery(req.zonasDelivery.trim());
        licenciaTenantRepository.save(licencia);

        return ResponseEntity.ok(Map.of(
            "activa", licencia.isWhatsappIaActiva(),
            "saludo", valorSeguro(licencia.getWhatsappIaSaludo()),
            "verifyToken", licencia.getWhatsappWebhookVerifyToken(),
            "politicaDelivery", valorSeguro(licencia.getWhatsappIaPoliticaDelivery()),
            "zonasDelivery", valorSeguro(licencia.getWhatsappIaZonasDelivery())
        ));
    }

    private Long tenantActual() {
        Long tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) throw new SecurityException("Tenant no identificado en la sesion");
        return tenantId;
    }

    private LicenciaTenant licencia(Long tenantId) {
        return licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new IllegalArgumentException("Tienda no encontrada"));
    }

    private String valorSeguro(String valor) {
        return valor == null ? "" : valor;
    }
}
