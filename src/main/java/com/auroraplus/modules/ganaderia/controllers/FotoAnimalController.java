package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.FotoAnimal;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.FotoAnimalRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaTenantAccess;
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
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        animalRepository.findById(animalId).filter(a -> tenantId.equals(a.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        return fotoAnimalRepository.findByAnimalId(animalId);
    }

    @PostMapping("/animal/{animalId}")
    public ResponseEntity<FotoAnimal> subir(@PathVariable Long animalId,
                                             @RequestParam("file") MultipartFile file, @RequestParam(defaultValue = "FOTO") String tipo) throws IOException {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA", "ENCARGADO_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        Animal animal = animalRepository.findById(animalId).filter(a -> tenantId.equals(a.getTenantId())).orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        if (file == null || file.isEmpty() || file.getSize() > 10 * 1024 * 1024) throw new IllegalArgumentException("Seleccione un archivo de hasta 10 MB");
        if (file.getContentType() == null || !file.getContentType().startsWith("image/")) throw new IllegalArgumentException("Solo se permiten imágenes");

        Path uploadDir = Paths.get("uploads/ganaderia-fotos");
        if (!Files.exists(uploadDir)) {
            Files.createDirectories(uploadDir);
        }

        String original = StringUtils.cleanPath(file.getOriginalFilename() == null ? "foto" : file.getOriginalFilename());
        if (original.contains("..")) throw new IllegalArgumentException("Nombre de archivo inválido");
        String filename = "animal_" + animalId + "_" + System.currentTimeMillis() + "_" + original.replaceAll("[^a-zA-Z0-9._-]", "_");
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
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA", "ENCARGADO_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        FotoAnimal foto = fotoAnimalRepository.findById(id).orElse(null);
        if (foto == null) {
            return ResponseEntity.notFound().build();
        }
        if (!foto.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Foto no pertenece a este tenant");
        }
        fotoAnimalRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
