package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.repositories.CasoHistoricoImportadoRepository;
import com.auroraplus.modules.salud.services.SaludImportacionHistoricaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * Carga masiva de historiales epidemiológicos desde Excel — ver
 * SaludImportacionHistoricaService para el formato esperado y el porqué.
 */
@RestController
@RequestMapping("/api/salud/canal-endemico/historico")
public class SaludImportacionHistoricaController {

    @Autowired
    private SaludImportacionHistoricaService importacionService;

    @Autowired
    private CasoHistoricoImportadoRepository casoHistoricoImportadoRepository;

    @PostMapping("/importar")
    public ResponseEntity<SaludImportacionHistoricaService.ResultadoImportacion> importar(
            @RequestParam("archivo") MultipartFile archivo) {
        Long tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            throw new RuntimeException("Tenant no identificado en la sesión");
        }
        if (archivo.isEmpty()) {
            throw new RuntimeException("El archivo está vacío");
        }
        try {
            var resultado = importacionService.importar(tenantId, archivo.getInputStream(), archivo.getOriginalFilename());
            return ResponseEntity.ok(resultado);
        } catch (IOException e) {
            throw new RuntimeException("No se pudo leer el archivo: " + e.getMessage());
        }
    }

    public record ImportacionResumen(String fuente, long filas) {}

    /** Lista las cargas ya hechas (agrupadas por archivo) — para saber qué ya se importó y poder deshacerlo si hace falta. */
    @GetMapping("/importaciones")
    public List<ImportacionResumen> listarImportaciones() {
        return casoHistoricoImportadoRepository.findAll().stream()
            .collect(java.util.stream.Collectors.groupingBy(
                c -> c.getFuente() == null ? "(sin nombre)" : c.getFuente(),
                java.util.stream.Collectors.counting()))
            .entrySet().stream()
            .map(e -> new ImportacionResumen(e.getKey(), e.getValue()))
            .toList();
    }

    @DeleteMapping("/importaciones/{fuente}")
    public ResponseEntity<Void> deshacerImportacion(@PathVariable String fuente) {
        importacionService.deshacerImportacion(fuente);
        return ResponseEntity.noContent().build();
    }
}
