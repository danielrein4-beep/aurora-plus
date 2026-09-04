package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.FotoAnimal;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.FotoAnimalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

/** Fotos/videos de un animal — catálogo digital, mismo patrón de almacenamiento local que /uploads/recibos en tamanacocomercial. */
@RestController
@RequestMapping("/api/ganaderia/fotos")
public class FotoAnimalController {

    @Autowired
    private FotoAnimalRepository fotoAnimalRepository;

    @Autowired
    private AnimalRepository animalRepository;

    @GetMapping("/animal/{animalId}")
    public List<FotoAnimal> listar(@PathVariable Long animalId) {
        return fotoAnimalRepository.findByAnimalId(animalId);
    }

    @PostMapping("/animal/{animalId}")
    public ResponseEntity<FotoAnimal> subir(@PathVariable Long animalId, @RequestParam Long tenantId,
                                             @RequestParam("file") MultipartFile file, @RequestParam(defaultValue = "FOTO") String tipo) throws IOException {
        Animal animal = animalRepository.findById(animalId).orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        if (!animal.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Animal no pertenece a este tenant");
        }

        Path uploadDir = Paths.get("uploads/ganaderia-fotos");
        if (!Files.exists(uploadDir)) {
            Files.createDirectories(uploadDir);
        }

        String filename = "animal_" + animalId + "_" + System.currentTimeMillis() + "_" + StringUtils.cleanPath(file.getOriginalFilename());
        Path filePath = uploadDir.resolve(filename);
        file.transferTo(filePath.toAbsolutePath().toFile());

        FotoAnimal foto = new FotoAnimal();
        foto.setTenantId(tenantId);
        foto.setAnimal(animal);
        foto.setUrl("/uploads/ganaderia-fotos/" + filename);
        foto.setTipo(tipo);

        return ResponseEntity.ok(fotoAnimalRepository.save(foto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        if (fotoAnimalRepository.existsById(id)) {
            fotoAnimalRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
