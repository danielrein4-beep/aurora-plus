package com.auroraplus.modules.horeca.controllers;

import com.auroraplus.modules.horeca.services.FastBarService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/horeca/fastbar")
public class FastBarController {

    @Autowired
    private FastBarService fastBarService;

    @PostMapping("/vender")
    public ResponseEntity<BigDecimal> venderTragoRapido(
            @RequestParam Long fastBarTragoId,
            @RequestParam Long tenantId,
            @RequestParam Integer cantidadTragos) {
        return ResponseEntity.ok(fastBarService.venderTragoRapido(fastBarTragoId, tenantId, cantidadTragos));
    }
}
