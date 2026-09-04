package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.BajaAnimal;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.BajaAnimalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/** Mortalidad/bajas: marca el animal como MUERTO y deja constancia del motivo — control sanitario y de pérdidas. */
@RestController
@RequestMapping("/api/ganaderia/bajas")
public class BajaAnimalController {

    @Autowired
    private BajaAnimalRepository bajaAnimalRepository;

    @Autowired
    private AnimalRepository animalRepository;

    public static class BajaRequest {
        public Long animalId;
        public LocalDate fecha;
        public String motivo;
        public String observaciones;
    }

    @GetMapping
    public List<BajaAnimal> listar() {
        return bajaAnimalRepository.findAll();
    }

    @PostMapping
    @Transactional
    public ResponseEntity<BajaAnimal> registrar(@RequestParam Long tenantId, @RequestBody BajaRequest request) {
        Animal animal = animalRepository.findById(request.animalId)
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        if (!animal.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Animal no pertenece a este tenant");
        }
        if (!"ACTIVO".equals(animal.getEstado())) {
            throw new RuntimeException("El animal ya no está activo (estado actual: " + animal.getEstado() + ")");
        }
        if (request.motivo == null || request.motivo.isBlank()) {
            throw new RuntimeException("El motivo de la baja es obligatorio");
        }

        animal.setEstado("MUERTO");
        animal.setPotrero(null);
        animalRepository.save(animal);

        BajaAnimal baja = new BajaAnimal();
        baja.setTenantId(tenantId);
        baja.setAnimal(animal);
        baja.setFecha(request.fecha != null ? request.fecha : LocalDate.now());
        baja.setMotivo(request.motivo);
        baja.setObservaciones(request.observaciones);

        return ResponseEntity.ok(bajaAnimalRepository.save(baja));
    }
}
