package com.auroraplus.modules.tamanacocomercial.controllers;

import com.auroraplus.modules.tamanacocomercial.entities.Gasto;
import com.auroraplus.modules.tamanacocomercial.repositories.GastoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tamanaco-comercial/gastos")
public class GastoController {

    @Autowired
    private GastoRepository gastoRepository;

    @GetMapping
    public List<Gasto> listarTodos() {
        return gastoRepository.findAllByOrderByIdDesc();
    }

    @PostMapping
    public Gasto crear(@RequestParam Long tenantId, @RequestBody Gasto gasto) {
        gasto.setTenantId(tenantId);
        if (gasto.getMoneda() == null || gasto.getMoneda().trim().isEmpty()) {
            gasto.setMoneda("COP");
        }
        if (gasto.getDescontado() == null) {
            gasto.setDescontado(false);
        }
        gasto.recalcularMontoUsd();
        return gastoRepository.save(gasto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Gasto> actualizar(@PathVariable Long id, @RequestBody Gasto detalles) {
        return gastoRepository.findById(id)
            .map(gasto -> {
                gasto.setFecha(detalles.getFecha());
                gasto.setCategoria(detalles.getCategoria());
                gasto.setDescripcion(detalles.getDescripcion());
                gasto.setMonto(detalles.getMonto());
                gasto.setMetodoPago(detalles.getMetodoPago());
                gasto.setMoneda(detalles.getMoneda() != null ? detalles.getMoneda() : "COP");
                gasto.setTasaCambioUsd(detalles.getTasaCambioUsd());
                gasto.setTipoGasto(detalles.getTipoGasto());
                gasto.setMinaAsociada(detalles.getMinaAsociada());
                if (detalles.getDescontado() != null) {
                    gasto.setDescontado(detalles.getDescontado());
                }
                gasto.recalcularMontoUsd();
                return ResponseEntity.ok(gastoRepository.save(gasto));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/toggle-descontado")
    public ResponseEntity<Gasto> toggleDescontado(@PathVariable Long id) {
        return gastoRepository.findById(id)
            .map(gasto -> {
                gasto.setDescontado(!Boolean.TRUE.equals(gasto.getDescontado()));
                return ResponseEntity.ok(gastoRepository.save(gasto));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        if (gastoRepository.existsById(id)) {
            gastoRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/{id}/upload-recibo")
    public ResponseEntity<Gasto> subirRecibo(@PathVariable Long id, @RequestParam("file") org.springframework.web.multipart.MultipartFile file) throws java.io.IOException {
        Gasto gasto = gastoRepository.findById(id).orElse(null);
        if (gasto == null) return ResponseEntity.notFound().build();

        java.nio.file.Path uploadDir = java.nio.file.Paths.get("uploads/recibos");
        if (!java.nio.file.Files.exists(uploadDir)) {
            java.nio.file.Files.createDirectories(uploadDir);
        }

        String filename = "gasto_" + id + "_" + System.currentTimeMillis() + "_" + org.springframework.util.StringUtils.cleanPath(file.getOriginalFilename());
        java.nio.file.Path filePath = uploadDir.resolve(filename);
        file.transferTo(filePath.toAbsolutePath().toFile());

        gasto.setReciboUrl("/uploads/recibos/" + filename);
        return ResponseEntity.ok(gastoRepository.save(gasto));
    }
}
