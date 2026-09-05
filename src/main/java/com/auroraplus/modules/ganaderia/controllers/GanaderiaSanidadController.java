package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.reportes.ExcelExportService;
import com.auroraplus.modules.ganaderia.services.GanaderiaSanidadService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/ganaderia/sanidad")
public class GanaderiaSanidadController {

    @Autowired
    private GanaderiaSanidadService ganaderiaSanidadService;

    @Autowired
    private ExcelExportService excelExportService;

    /** Refuerzos de vacuna pendientes + animales todavía en período de retiro de leche/carne — todo en un solo lugar. */
    @GetMapping("/alertas")
    public List<GanaderiaSanidadService.AlertaSanitaria> alertas(@RequestParam Long tenantId) {
        return ganaderiaSanidadService.obtenerAlertasSanitarias(tenantId);
    }

    @GetMapping("/alertas/export-excel")
    public ResponseEntity<byte[]> alertasExcel(@RequestParam Long tenantId) throws Exception {
        List<GanaderiaSanidadService.AlertaSanitaria> alertas = ganaderiaSanidadService.obtenerAlertasSanitarias(tenantId);

        List<List<Object>> filas = new ArrayList<>();
        for (GanaderiaSanidadService.AlertaSanitaria a : alertas) {
            filas.add(List.of(a.tipo, a.animal.getArete(), a.producto, a.fechaRelevante.toString(), a.mensaje));
        }

        byte[] excel = excelExportService.generar("Alertas Sanitarias",
            List.of("Tipo", "Arete", "Producto", "Fecha", "Mensaje"), filas);

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"alertas-sanitarias.xlsx\"")
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(excel);
    }
}
