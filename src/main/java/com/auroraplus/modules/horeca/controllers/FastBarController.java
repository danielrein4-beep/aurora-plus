package com.auroraplus.modules.horeca.controllers;

import com.auroraplus.modules.horeca.entities.FastBarTrago;
import com.auroraplus.modules.horeca.repositories.FastBarTragoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * Solo el catálogo de tragos (alta/listado) — la venta de un trago ya no
 * pasa por acá: antes había un endpoint aparte ("/vender") que descontaba
 * inventario pero no dejaba ticket ni aparecía en reportes; ahora un trago
 * de Fast-Bar se agrega como cualquier otro ítem de la comanda
 * (POST /api/horeca/comandas/{id}/items con fastBarTragoId), un solo camino
 * de venta para todo el catálogo (ver HorecaService.agregarItemComanda).
 */
@RestController
@RequestMapping("/api/horeca/fastbar")
public class FastBarController {

    @Autowired
    private FastBarTragoRepository fastBarTragoRepository;

    @GetMapping
    public List<FastBarTrago> listar(@RequestParam Long tenantId) {
        return fastBarTragoRepository.findByTenantId(tenantId);
    }

    @PostMapping
    public ResponseEntity<FastBarTrago> crear(@RequestParam Long tenantId, @RequestBody FastBarTrago trago) {
        trago.setTenantId(tenantId);
        return ResponseEntity.ok(fastBarTragoRepository.save(trago));
    }
}
