package com.auroraplus.core.config;

import com.auroraplus.core.config.entities.ComisionPlataforma;
import com.auroraplus.core.config.repositories.ComisionPlataformaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Comisiones de intermediación pendientes de cobro a los tenants (ej: ofertas de compra aceptadas en Ganadería). */
@RestController
@RequestMapping("/api/super-admin/comisiones")
public class ComisionPlataformaController {

    @Autowired
    private ComisionPlataformaRepository comisionPlataformaRepository;

    @GetMapping
    public List<ComisionPlataforma> listar(@RequestParam(required = false) Boolean pagada) {
        return pagada != null ? comisionPlataformaRepository.findByPagada(pagada) : comisionPlataformaRepository.findAll();
    }

    @PostMapping("/{id}/marcar-pagada")
    public ResponseEntity<ComisionPlataforma> marcarPagada(@PathVariable Long id) {
        ComisionPlataforma comision = comisionPlataformaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Comisión no encontrada"));
        comision.setPagada(true);
        return ResponseEntity.ok(comisionPlataformaRepository.save(comision));
    }
}
