package com.auroraplus.core.ocr.controllers;

import com.auroraplus.core.ocr.dto.FacturaExtraidaDTO;
import com.auroraplus.core.ocr.services.FacturaOcrService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * OCR genérico de facturas de proveedor — disponible para cualquier módulo
 * de compras (Horeca, Repuestos, Moda, Ganadería...), no exclusivo de uno.
 * Solo extrae y devuelve una propuesta; el usuario la revisa y confirma
 * enviándola al endpoint real de compra de cada módulo (nunca se registra
 * automáticamente desde aquí).
 */
@RestController
@RequestMapping("/api/ocr/facturas")
public class FacturaOcrController {

    @Autowired
    private FacturaOcrService facturaOcrService;

    @PostMapping(value = "/extraer", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> extraerFactura(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El archivo de imagen es obligatorio."));
        }

        String contentType = file.getContentType();
        if (contentType == null || (!contentType.startsWith("image/") && !contentType.equals("application/pdf") && !contentType.equals("application/octet-stream"))) {
            return ResponseEntity.badRequest().body(Map.of("error", "Solo se aceptan imágenes (JPEG, PNG, WEBP) o PDF."));
        }

        long maxSize = 10L * 1024 * 1024;
        if (file.getSize() > maxSize) {
            return ResponseEntity.badRequest().body(Map.of("error", "La imagen no debe superar los 10 MB."));
        }

        try {
            FacturaExtraidaDTO datos = facturaOcrService.procesarFactura(file);
            return ResponseEntity.ok(datos);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(503).body(Map.of("error", e.getMessage(), "tipo", "CONFIG_ERROR"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "error", "Error al procesar la factura con IA.",
                "detalle", e.getMessage() != null ? e.getMessage() : "Error desconocido"));
        }
    }
}
