package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.MovimientoPotrero;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.MovimientoPotreroRepository;
import com.auroraplus.modules.ganaderia.services.AnimalQrService;
import com.auroraplus.modules.ganaderia.services.GanaderiaMovimientoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ganaderia/animales")
public class AnimalController {

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private MovimientoPotreroRepository movimientoPotreroRepository;

    @Autowired
    private GanaderiaMovimientoService ganaderiaMovimientoService;

    @Autowired
    private AnimalQrService animalQrService;

    @GetMapping
    public List<Animal> listar(@RequestParam(required = false) String estado) {
        return estado != null ? animalRepository.findByEstado(estado) : animalRepository.findAll();
    }

    @GetMapping("/{id}")
    public Animal obtener(@PathVariable Long id) {
        return animalRepository.findById(id).orElseThrow(() -> new RuntimeException("Animal no encontrado"));
    }

    @GetMapping("/arete/{arete}")
    public Animal buscarPorArete(@PathVariable String arete) {
        return animalRepository.findByArete(arete).orElseThrow(() -> new RuntimeException("Animal no encontrado para el arete: " + arete));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Animal> actualizar(@PathVariable Long id, @RequestBody Animal datos) {
        Animal animal = animalRepository.findById(id).orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        animal.setNombre(datos.getNombre());
        animal.setRaza(datos.getRaza());
        animal.setTipoAnimal(datos.getTipoAnimal());
        animal.setPesoActual(datos.getPesoActual());
        return ResponseEntity.ok(animalRepository.save(animal));
    }

    public static class MoverRequest {
        public Long potreroDestinoId;
        public String motivo;
    }

    @PostMapping("/{id}/mover")
    public ResponseEntity<MovimientoPotrero> mover(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody MoverRequest request) {
        return ResponseEntity.ok(ganaderiaMovimientoService.moverAnimal(tenantId, id, request.potreroDestinoId, request.motivo));
    }

    @GetMapping("/{id}/kardex-ubicacion")
    public List<MovimientoPotrero> kardexUbicacion(@PathVariable Long id) {
        return movimientoPotreroRepository.findByAnimalIdOrderByFechaRegistroDesc(id);
    }

    /** Ficha con código QR del animal, para identificación rápida en el campo con el celular. */
    @GetMapping(value = "/{id}/qr", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> fichaQr(@PathVariable Long id) throws Exception {
        Animal animal = animalRepository.findById(id).orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        byte[] pdf = animalQrService.generarFichaQr(animal);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"qr-" + animal.getArete() + ".pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }
}
