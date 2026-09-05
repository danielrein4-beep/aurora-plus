package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.TabuladorPasto;
import com.auroraplus.modules.ganaderia.repositories.TabuladorPastoRepository;
import com.auroraplus.modules.ganaderia.services.ReferenciaPastoreoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Tabulador de pastoreo editable por tenant — cada negocio ajusta aquí sus
 * propios valores de carga animal y descanso, partiendo de los valores de
 * referencia sembrados automáticamente (ver ReferenciaPastoreoService).
 */
@RestController
@RequestMapping("/api/ganaderia/tabulador-pasto")
public class TabuladorPastoController {

    @Autowired
    private TabuladorPastoRepository tabuladorPastoRepository;

    @Autowired
    private ReferenciaPastoreoService referenciaPastoreoService;

    @GetMapping
    public List<TabuladorPasto> listar(@RequestParam Long tenantId) {
        List<TabuladorPasto> tabulador = tabuladorPastoRepository.findByTenantId(tenantId);
        if (tabulador.isEmpty()) {
            tabulador = referenciaPastoreoService.sembrarValoresPorDefecto(tenantId);
        }
        return tabulador;
    }

    /** Sembrar manualmente los valores de referencia por defecto — falla si el tenant ya tiene su tabulador (para no pisar ediciones existentes). */
    @PostMapping("/sembrar-valores-defecto")
    public List<TabuladorPasto> sembrarValoresDefecto(@RequestParam Long tenantId) {
        return referenciaPastoreoService.sembrarValoresPorDefecto(tenantId);
    }

    @PostMapping
    public ResponseEntity<TabuladorPasto> crear(@RequestParam Long tenantId, @RequestBody TabuladorPasto fila) {
        fila.setTenantId(tenantId);
        if (fila.isEsGenerico() && tabuladorPastoRepository.findByTenantIdAndEsGenericoTrue(tenantId).isPresent()) {
            throw new RuntimeException("Este tenant ya tiene una fila genérica — edítela en vez de crear otra");
        }
        return ResponseEntity.ok(tabuladorPastoRepository.save(fila));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TabuladorPasto> actualizar(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody TabuladorPasto datos) {
        TabuladorPasto fila = tabuladorPastoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Fila de tabulador no encontrada"));
        if (!fila.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: fila no pertenece a este tenant");
        }
        fila.setNombre(datos.getNombre());
        fila.setAnimalesPorHectarea(datos.getAnimalesPorHectarea());
        fila.setDiasDescansoRecomendado(datos.getDiasDescansoRecomendado());
        return ResponseEntity.ok(tabuladorPastoRepository.save(fila));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id, @RequestParam Long tenantId) {
        TabuladorPasto fila = tabuladorPastoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Fila de tabulador no encontrada"));
        if (!fila.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: fila no pertenece a este tenant");
        }
        if (fila.isEsGenerico()) {
            throw new RuntimeException("No se puede eliminar la fila genérica — es el respaldo cuando un tipo de pasto no coincide con ninguna otra fila");
        }
        tabuladorPastoRepository.delete(fila);
        return ResponseEntity.ok().build();
    }
}
