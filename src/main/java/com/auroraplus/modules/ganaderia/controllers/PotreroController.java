package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.Potrero;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.PotreroRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ganaderia/potreros")
public class PotreroController {

    @Autowired
    private PotreroRepository potreroRepository;

    @Autowired
    private AnimalRepository animalRepository;

    @GetMapping
    public List<Potrero> listar() {
        return potreroRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<Potrero> crear(@RequestParam Long tenantId, @RequestBody Potrero potrero) {
        potrero.setTenantId(tenantId);
        return ResponseEntity.ok(potreroRepository.save(potrero));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Potrero> actualizar(@PathVariable Long id, @RequestBody Potrero datos) {
        Potrero potrero = potreroRepository.findById(id).orElseThrow(() -> new RuntimeException("Potrero no encontrado"));
        potrero.setNombre(datos.getNombre());
        potrero.setAreaHectareas(datos.getAreaHectareas());
        potrero.setCapacidadAnimales(datos.getCapacidadAnimales());
        potrero.setTipoPasto(datos.getTipoPasto());

        // Al entrar en descanso se marca la fecha de inicio (para contar días); al
        // volver a activo se limpia, para que un descanso futuro cuente desde cero.
        boolean entraEnDescanso = "EN_DESCANSO".equals(datos.getEstado()) && !"EN_DESCANSO".equals(potrero.getEstado());
        boolean vuelveActivo = "ACTIVO".equals(datos.getEstado()) && !"ACTIVO".equals(potrero.getEstado());
        if (entraEnDescanso) potrero.setFechaInicioDescanso(java.time.LocalDate.now());
        if (vuelveActivo) potrero.setFechaInicioDescanso(null);

        potrero.setEstado(datos.getEstado());
        return ResponseEntity.ok(potreroRepository.save(potrero));
    }

    /** Mapa de potreros: cada potrero con sus animales actuales y % de ocupación — base para la vista visual del frontend. */
    @GetMapping("/mapa")
    public List<Map<String, Object>> mapa() {
        List<Potrero> potreros = potreroRepository.findAll();
        List<Map<String, Object>> resultado = new ArrayList<>();

        for (Potrero potrero : potreros) {
            List<Animal> animales = animalRepository.findByPotreroIdAndEstado(potrero.getId(), "ACTIVO");
            Map<String, Object> entrada = new LinkedHashMap<>();
            entrada.put("potrero", potrero);
            entrada.put("animales", animales);
            entrada.put("cantidadAnimales", animales.size());
            if (potrero.getCapacidadAnimales() != null && potrero.getCapacidadAnimales() > 0) {
                entrada.put("porcentajeOcupacion",
                    Math.round((animales.size() * 10000.0) / potrero.getCapacidadAnimales()) / 100.0);
            } else {
                entrada.put("porcentajeOcupacion", null);
            }
            resultado.add(entrada);
        }
        return resultado;
    }
}
