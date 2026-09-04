package com.auroraplus.modules.tamanacocomercial.controllers;

import com.auroraplus.modules.tamanacocomercial.entities.Mina;
import com.auroraplus.modules.tamanacocomercial.repositories.MinaRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tamanaco-comercial/minas")
public class MinaController {

    @Autowired
    private MinaRepository minaRepository;

    @GetMapping
    public List<Mina> listar() {
        return minaRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<Mina> crear(@RequestParam Long tenantId, @RequestBody Mina mina) {
        mina.setTenantId(tenantId);
        Mina guardada = minaRepository.save(mina);
        return ResponseEntity.status(201).body(guardada);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Mina> actualizar(@PathVariable Long id, @RequestBody Mina datos) {
        return minaRepository.findById(id)
            .map(mina -> {
                mina.setNombre(datos.getNombre());
                mina.setTarifaCopPorTon(datos.getTarifaCopPorTon());
                mina.setActiva(datos.getActiva() != null ? datos.getActiva() : mina.getActiva());
                return ResponseEntity.ok(minaRepository.save(mina));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Map<String, String>> eliminar(@PathVariable Long id) {
        return minaRepository.findById(id)
            .map(mina -> {
                mina.setActiva(false);
                minaRepository.save(mina);
                return ResponseEntity.ok(Map.of("message", "Mina desactivada correctamente. El historial se conserva."));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}/permanente")
    @Transactional
    public ResponseEntity<Map<String, String>> eliminarPermanente(@PathVariable Long id) {
        if (!minaRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        try {
            minaRepository.deleteById(id);
            minaRepository.flush();
            return ResponseEntity.ok(Map.of("message", "Mina eliminada permanentemente."));
        } catch (DataIntegrityViolationException ex) {
            return ResponseEntity.status(400).body(Map.of("message",
                "No se puede eliminar la mina porque tiene registros asociados. "
                    + "Usa \"Desactivar\" para ocultarla sin perder el historial."));
        }
    }
}
