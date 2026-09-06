package com.auroraplus.modules.horeca.controllers;

import com.auroraplus.modules.horeca.entities.FastBarTrago;
import com.auroraplus.modules.horeca.repositories.FastBarTragoRepository;
import com.auroraplus.modules.horeca.services.FastBarService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/horeca/fastbar")
public class FastBarController {

    @Autowired
    private FastBarService fastBarService;

    @Autowired
    private FastBarTragoRepository fastBarTragoRepository;

    // Catálogo de tragos rápidos — antes no existía ningún endpoint para darlos de
    // alta, solo se podía vender uno si ya existía la fila (había que insertarla a
    // mano en la base de datos).
    @GetMapping
    public List<FastBarTrago> listar(@RequestParam Long tenantId) {
        return fastBarTragoRepository.findByTenantId(tenantId);
    }

    @PostMapping
    public ResponseEntity<FastBarTrago> crear(@RequestParam Long tenantId, @RequestBody FastBarTrago trago) {
        trago.setTenantId(tenantId);
        return ResponseEntity.ok(fastBarTragoRepository.save(trago));
    }

    @PostMapping("/vender")
    public ResponseEntity<BigDecimal> venderTragoRapido(
            @RequestParam Long fastBarTragoId,
            @RequestParam Long tenantId,
            @RequestParam Integer cantidadTragos,
            @RequestParam(required = false) String monedaPago,
            @RequestParam(required = false) BigDecimal montoRecibido,
            @RequestParam(required = false) String claveIdempotencia) {
        return ResponseEntity.ok(fastBarService.venderTragoRapido(fastBarTragoId, tenantId, cantidadTragos,
            monedaPago, montoRecibido, claveIdempotencia));
    }
}
