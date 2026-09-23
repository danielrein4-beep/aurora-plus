package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.services.GanaderiaReportesGestionPdfService;
import com.auroraplus.modules.ganaderia.services.GanaderiaTenantAccess;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/** Reportes PDF de gestión: inventario del hato, engorde, potreros y liquidación de sociedad. */
@RestController
@RequestMapping("/api/ganaderia/reportes")
public class GanaderiaReportesController {

    @Autowired
    private GanaderiaReportesGestionPdfService service;

    @GetMapping(value = "/hato/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> hato() throws Exception {
        return pdf(service.inventarioHato(GanaderiaTenantAccess.requireTenant()), "inventario-hato");
    }

    @GetMapping(value = "/engorde/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> engorde(@RequestParam(required = false) Long potreroId,
                                          @RequestParam(required = false) String lote) throws Exception {
        return pdf(service.engorde(GanaderiaTenantAccess.requireTenant(), potreroId, lote), "engorde");
    }

    @GetMapping(value = "/potreros/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> potreros() throws Exception {
        return pdf(service.potreros(GanaderiaTenantAccess.requireTenant()), "potreros");
    }

    @GetMapping(value = "/sociedades/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> liquidacionSociedad(@PathVariable Long id) throws Exception {
        return pdf(service.liquidacionSociedad(GanaderiaTenantAccess.requireTenant(), id), "liquidacion-sociedad-" + id);
    }

    private static ResponseEntity<byte[]> pdf(byte[] contenido, String nombre) {
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + nombre + "-" + LocalDate.now() + ".pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(contenido);
    }
}
