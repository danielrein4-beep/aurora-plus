package com.auroraplus.core.inventario.controllers;

import com.auroraplus.core.inventario.entities.ConteoFisico;
import com.auroraplus.core.inventario.entities.DetalleConteoFisico;
import com.auroraplus.core.inventario.repositories.ConteoFisicoRepository;
import com.auroraplus.core.inventario.repositories.DetalleConteoFisicoRepository;
import com.auroraplus.core.inventario.services.ConteoFisicoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/** Conteo físico ciego del inventario (Inventario Inteligente Automatizado). */
@RestController
@RequestMapping("/api/inventario/conteos")
public class ConteoFisicoController {

    @Autowired
    private ConteoFisicoService conteoFisicoService;

    @Autowired
    private ConteoFisicoRepository conteoFisicoRepository;

    @Autowired
    private DetalleConteoFisicoRepository detalleConteoFisicoRepository;

    @GetMapping
    public List<ConteoFisico> listar() {
        return conteoFisicoRepository.findAllByOrderByFechaInicioDesc();
    }

    @GetMapping("/{id}")
    public ConteoFisico obtener(@PathVariable Long id) {
        return conteoFisicoRepository.findById(id).orElseThrow(() -> new RuntimeException("Conteo no encontrado"));
    }

    @PostMapping("/iniciar")
    public ResponseEntity<ConteoFisico> iniciar(@RequestParam Long tenantId, @RequestParam String responsable) {
        return ResponseEntity.ok(conteoFisicoService.iniciarConteo(tenantId, responsable));
    }

    public static class RegistrarConteoRequest {
        public Long articuloId;
        public BigDecimal stockFisicoContado;
    }

    @PostMapping("/{id}/registrar")
    public ResponseEntity<DetalleConteoFisico> registrar(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody RegistrarConteoRequest request) {
        return ResponseEntity.ok(conteoFisicoService.registrarConteoArticulo(id, tenantId, request.articuloId, request.stockFisicoContado));
    }

    @GetMapping("/{id}/detalles")
    public List<DetalleConteoFisico> detalles(@PathVariable Long id) {
        return detalleConteoFisicoRepository.findByConteoId(id);
    }

    @PostMapping("/{id}/cerrar")
    public ResponseEntity<ConteoFisico> cerrar(@PathVariable Long id, @RequestParam Long tenantId) {
        return ResponseEntity.ok(conteoFisicoService.cerrarConteo(id, tenantId));
    }
}
