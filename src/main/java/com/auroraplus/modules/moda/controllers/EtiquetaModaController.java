package com.auroraplus.modules.moda.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.moda.entities.VarianteModa;
import com.auroraplus.modules.moda.repositories.VarianteModaRepository;
import com.auroraplus.modules.moda.services.EtiquetaModaPdfService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

/** Etiquetas con código de barras real para el lector del punto de venta e impresoras Zebra/Xprinter (Subfase 6.2). */
@RestController
@RequestMapping("/api/moda/etiquetas")
public class EtiquetaModaController {

    @Autowired
    private VarianteModaRepository varianteModaRepository;

    @Autowired
    private EtiquetaModaPdfService etiquetaModaPdfService;

    @GetMapping(value = "/{varianteId}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> etiquetaIndividual(@PathVariable Long varianteId) throws Exception {
        Long tenantId = TenantContext.getCurrentTenant();
        VarianteModa variante = varianteModaRepository.findById(varianteId)
            .filter(v -> tenantId != null && tenantId.equals(v.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Variante no encontrada"));
        byte[] pdf = etiquetaModaPdfService.generarEtiquetaIndividual(variante);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"etiqueta-" + variante.getCodigoBarras() + ".pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }

    @GetMapping(value = "/hoja/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> hojaEtiquetas(@RequestParam List<Long> varianteIds,
                                                 @RequestParam(defaultValue = "1") int copias) throws Exception {
        Long tenantId = TenantContext.getCurrentTenant();
        List<VarianteModa> variantes = new ArrayList<>();
        for (Long id : varianteIds) {
            variantes.add(varianteModaRepository.findById(id)
                .filter(v -> tenantId != null && tenantId.equals(v.getTenantId()))
                .orElseThrow(() -> new RuntimeException("Variante no encontrada: " + id)));
        }
        byte[] pdf = etiquetaModaPdfService.generarHojaEtiquetas(variantes, copias);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"hoja-etiquetas-moda.pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }
}
