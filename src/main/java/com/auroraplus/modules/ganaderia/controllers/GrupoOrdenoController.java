package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.GrupoOrdeno;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.GrupoOrdenoRepository;
import com.auroraplus.modules.ganaderia.repositories.RegistroOrdenoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Grupos/lotes de ordeño: organiza a las hembras en producción en cuadrillas
 * fijas que se ordeñan juntas, en un orden — sin esto, el ordeño era 100%
 * individual, sin ninguna rutina ni agrupación (ver GrupoOrdeno).
 */
@RestController
@RequestMapping("/api/ganaderia/grupos-ordeno")
public class GrupoOrdenoController {

    @Autowired
    private GrupoOrdenoRepository grupoOrdenoRepository;

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private RegistroOrdenoRepository registroOrdenoRepository;

    @GetMapping
    public List<GrupoOrdeno> listar(@RequestParam Long tenantId) {
        return grupoOrdenoRepository.findByTenantIdOrderByOrdenRotacionAsc(tenantId);
    }

    @PostMapping
    public ResponseEntity<GrupoOrdeno> crear(@RequestParam Long tenantId, @RequestBody GrupoOrdeno grupo) {
        grupo.setTenantId(tenantId);
        return ResponseEntity.ok(grupoOrdenoRepository.save(grupo));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GrupoOrdeno> actualizar(@PathVariable Long id, @RequestBody GrupoOrdeno datos) {
        GrupoOrdeno grupo = grupoOrdenoRepository.findById(id).orElseThrow(() -> new RuntimeException("Grupo de ordeño no encontrado"));
        grupo.setNombre(datos.getNombre());
        grupo.setHorario(datos.getHorario());
        grupo.setOrdenRotacion(datos.getOrdenRotacion());
        grupo.setActivo(datos.isActivo());
        return ResponseEntity.ok(grupoOrdenoRepository.save(grupo));
    }

    /** Asigna un animal a este grupo (lo saca de cualquier otro grupo anterior). */
    @PostMapping("/{id}/asignar-animal")
    public ResponseEntity<Animal> asignarAnimal(@PathVariable Long id, @RequestParam Long tenantId, @RequestParam Long animalId) {
        GrupoOrdeno grupo = grupoOrdenoRepository.findById(id).orElseThrow(() -> new RuntimeException("Grupo de ordeño no encontrado"));
        if (!grupo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Grupo no pertenece a este tenant");
        }
        Animal animal = animalRepository.findById(animalId).orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        if (!animal.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Animal no pertenece a este tenant");
        }
        animal.setGrupoOrdeno(grupo);
        return ResponseEntity.ok(animalRepository.save(animal));
    }

    /** Quita al animal de cualquier grupo de ordeño (vuelve a ordeño individual sin agrupar). */
    @PostMapping("/quitar-animal")
    public ResponseEntity<Animal> quitarAnimal(@RequestParam Long tenantId, @RequestParam Long animalId) {
        Animal animal = animalRepository.findById(animalId).orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        if (!animal.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Animal no pertenece a este tenant");
        }
        animal.setGrupoOrdeno(null);
        return ResponseEntity.ok(animalRepository.save(animal));
    }

    /** Cada grupo con sus animales y el total de litros que produjo en la fecha indicada (por defecto, hoy). */
    @GetMapping("/resumen")
    public List<Map<String, Object>> resumen(@RequestParam Long tenantId, @RequestParam(required = false) LocalDate fecha) {
        LocalDate fechaConsulta = fecha != null ? fecha : LocalDate.now();
        List<GrupoOrdeno> grupos = grupoOrdenoRepository.findByTenantIdOrderByOrdenRotacionAsc(tenantId);
        List<Map<String, Object>> resultado = new java.util.ArrayList<>();

        for (GrupoOrdeno grupo : grupos) {
            List<Animal> animales = animalRepository.findByEstado("ACTIVO").stream()
                .filter(a -> a.getTenantId().equals(tenantId))
                .filter(a -> a.getGrupoOrdeno() != null && a.getGrupoOrdeno().getId().equals(grupo.getId()))
                .toList();

            BigDecimal totalLitros = registroOrdenoRepository.findByTenantIdAndFechaBetween(tenantId, fechaConsulta, fechaConsulta).stream()
                .filter(r -> r.getGrupoOrdeno() != null && r.getGrupoOrdeno().getId().equals(grupo.getId()))
                .map(r -> r.getCantidadLitros())
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

            Map<String, Object> entrada = new LinkedHashMap<>();
            entrada.put("grupo", grupo);
            entrada.put("animales", animales);
            entrada.put("cantidadAnimales", animales.size());
            entrada.put("totalLitros", totalLitros);
            resultado.add(entrada);
        }
        return resultado;
    }
}
