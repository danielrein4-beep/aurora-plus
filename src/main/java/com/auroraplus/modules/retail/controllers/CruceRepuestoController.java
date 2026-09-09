package com.auroraplus.modules.retail.controllers;

import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.core.inventario.entities.CruceRepuesto;
import com.auroraplus.core.inventario.repositories.ArticuloRepository;
import com.auroraplus.core.inventario.repositories.CruceRepuestoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Catálogo de cruce (compatibilidad pieza↔vehículo) — solo relevante para la capa Repuestos. */
@RestController
@RequestMapping("/api/retail/cruces")
public class CruceRepuestoController {

    @Autowired
    private CruceRepuestoRepository cruceRepuestoRepository;

    @Autowired
    private ArticuloRepository articuloRepository;

    @GetMapping
    public List<CruceRepuesto> listarPorArticulo(@RequestParam Long articuloId, @RequestParam Long tenantId) {
        return cruceRepuestoRepository.findByArticuloIdAndTenantId(articuloId, tenantId);
    }

    @PostMapping
    public ResponseEntity<CruceRepuesto> crear(@RequestParam Long tenantId, @RequestParam Long articuloId,
                                                 @RequestBody CruceRepuesto cruce) {
        Articulo articulo = articuloRepository.findById(articuloId)
            .orElseThrow(() -> new RuntimeException("Artículo no encontrado: " + articuloId));
        if (!articulo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Artículo no pertenece a este tenant");
        }
        cruce.setTenantId(tenantId);
        cruce.setArticulo(articulo);
        return ResponseEntity.ok(cruceRepuestoRepository.save(cruce));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id, @RequestParam Long tenantId) {
        CruceRepuesto cruce = cruceRepuestoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Cruce no encontrado"));
        if (!cruce.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Cruce no pertenece a este tenant");
        }
        cruceRepuestoRepository.delete(cruce);
        return ResponseEntity.noContent().build();
    }
}
