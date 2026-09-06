package com.auroraplus.core.inventario.controllers;

import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.core.inventario.entities.PresentacionArticulo;
import com.auroraplus.core.inventario.repositories.ArticuloRepository;
import com.auroraplus.core.inventario.repositories.PresentacionArticuloRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Catálogo de presentaciones de compra por artículo (six-pack, bolsa x30, caja
// x24, etc.) — a nivel de core.inventario para que cualquier vertical lo use,
// no solo Horeca.
@RestController
@RequestMapping("/api/inventario/presentaciones")
public class PresentacionArticuloController {

    @Autowired
    private PresentacionArticuloRepository presentacionArticuloRepository;

    @Autowired
    private ArticuloRepository articuloRepository;

    @GetMapping
    public List<PresentacionArticulo> listarPorArticulo(@RequestParam Long articuloId) {
        return presentacionArticuloRepository.findByArticuloId(articuloId);
    }

    @PostMapping
    public ResponseEntity<PresentacionArticulo> crear(@RequestParam Long tenantId, @RequestParam Long articuloId,
                                                        @RequestBody PresentacionArticulo presentacion) {
        Articulo articulo = articuloRepository.findById(articuloId)
            .orElseThrow(() -> new RuntimeException("Artículo no encontrado: " + articuloId));
        if (!articulo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Artículo no pertenece a este tenant");
        }
        presentacion.setTenantId(tenantId);
        presentacion.setArticulo(articulo);
        return ResponseEntity.ok(presentacionArticuloRepository.save(presentacion));
    }
}
