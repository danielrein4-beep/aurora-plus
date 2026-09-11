package com.auroraplus.modules.salud.laboratorio.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.laboratorio.services.PortalLaboratorioPacienteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Lado del doctor: obtener la URL/QR fijos de SU portal de recepción de
 * laboratorio, para imprimirlo en la página 2 del informe de consulta (ver
 * frontend/src/utils/pdfReports.ts).
 */
@RestController
@RequestMapping("/api/salud/laboratorio/portal")
public class PortalLaboratorioAdminController {

    @Autowired
    private PortalLaboratorioPacienteService portalService;

    @GetMapping("/url")
    public ResponseEntity<Map<String, String>> obtenerUrl() {
        Long tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.ok(Map.of("url", portalService.obtenerUrlPortal(tenantId)));
    }

    @GetMapping(value = "/qr.png", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> obtenerQrPng() throws Exception {
        Long tenantId = TenantContext.getCurrentTenant();
        byte[] png = portalService.generarQrPortalPng(tenantId);
        return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).body(png);
    }
}
