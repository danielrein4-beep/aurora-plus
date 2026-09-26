package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.modules.ganaderia.services.GanaderiaTenantAccess;
import com.auroraplus.modules.ganaderia.services.MargenGanaderoPdfService;
import com.auroraplus.modules.ganaderia.services.MargenGanaderoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

/**
 * Margen por animal y por lote (costos directos e indirectos contra venta o valor proyectado)
 * y sus reportes PDF. Solo dueño y administrador: incluye la nómina repartida.
 */
@RestController
@RequestMapping("/api/ganaderia/margen")
public class MargenGanaderoController {

    @Autowired
    private MargenGanaderoService service;

    @Autowired
    private MargenGanaderoPdfService pdfService;

    @GetMapping
    public MargenGanaderoService.Resultado margen(@RequestParam(required = false) BigDecimal precioKg,
                                                  @RequestParam(required = false) String alcance) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA");
        return service.calcular(GanaderiaTenantAccess.requireTenant(), precioKg, alcance);
    }

    @GetMapping(value = "/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> pdfPorLote(@RequestParam(required = false) BigDecimal precioKg,
                                             @RequestParam(required = false) String alcance,
                                             @RequestParam(required = false) String lote) throws Exception {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA");
        byte[] pdf = pdfService.porLote(GanaderiaTenantAccess.requireTenant(), precioKg, alcance, lote);
        return respuesta(pdf, "margen-por-lote");
    }

    @GetMapping(value = "/animal/{animalId}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> pdfAnimal(@PathVariable Long animalId,
                                            @RequestParam(required = false) BigDecimal precioKg) throws Exception {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA");
        byte[] pdf = pdfService.animal(GanaderiaTenantAccess.requireTenant(), animalId, precioKg);
        return respuesta(pdf, "margen-animal-" + animalId);
    }

    private static ResponseEntity<byte[]> respuesta(byte[] pdf, String nombre) {
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + nombre + ".pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }
}
