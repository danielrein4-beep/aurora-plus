package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.RegistroPeso;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.RegistroPesoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Pesaje periódico: curva de crecimiento/engorde del animal. */
@RestController
@RequestMapping("/api/ganaderia/pesos")
public class RegistroPesoController {

    @Autowired
    private RegistroPesoRepository registroPesoRepository;

    @Autowired
    private AnimalRepository animalRepository;

    public static class RegistroRequest {
        public Long animalId;
        public LocalDate fecha;
        public BigDecimal pesoKg;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<RegistroPeso> registrar(@RequestParam Long tenantId, @RequestBody RegistroRequest request) {
        Animal animal = animalRepository.findById(request.animalId)
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        if (!animal.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Animal no pertenece a este tenant");
        }
        if (request.pesoKg == null || request.pesoKg.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("El peso debe ser mayor a cero");
        }

        RegistroPeso registro = new RegistroPeso();
        registro.setTenantId(tenantId);
        registro.setAnimal(animal);
        registro.setFecha(request.fecha != null ? request.fecha : LocalDate.now());
        registro.setPesoKg(request.pesoKg);
        registroPesoRepository.save(registro);

        // Mantiene sincronizado el peso "actual" del animal con el último registro.
        animal.setPesoActual(request.pesoKg);
        animalRepository.save(animal);

        return ResponseEntity.ok(registro);
    }

    @GetMapping("/animal/{animalId}")
    public List<RegistroPeso> curvaAnimal(@PathVariable Long animalId) {
        return registroPesoRepository.findByAnimalIdOrderByFechaAsc(animalId);
    }

    /** GDP (ganancia diaria de peso) entre el primer y el último pesaje registrado — clave para decidir cuándo vender. */
    @GetMapping("/animal/{animalId}/gdp")
    public Map<String, Object> gananciaDiariaPeso(@PathVariable Long animalId) {
        List<RegistroPeso> historial = registroPesoRepository.findByAnimalIdOrderByFechaAsc(animalId);
        Map<String, Object> resultado = new LinkedHashMap<>();

        if (historial.size() < 2) {
            resultado.put("gdpKgDia", null);
            resultado.put("mensaje", "Se necesitan al menos 2 pesajes para calcular la GDP");
            resultado.put("cantidadPesajes", historial.size());
            return resultado;
        }

        RegistroPeso primero = historial.get(0);
        RegistroPeso ultimo = historial.get(historial.size() - 1);
        long dias = ChronoUnit.DAYS.between(primero.getFecha(), ultimo.getFecha());
        BigDecimal gananciaTotal = ultimo.getPesoKg().subtract(primero.getPesoKg());

        resultado.put("pesoInicial", primero.getPesoKg());
        resultado.put("pesoActual", ultimo.getPesoKg());
        resultado.put("fechaInicial", primero.getFecha());
        resultado.put("fechaActual", ultimo.getFecha());
        resultado.put("gananciaTotalKg", gananciaTotal);
        resultado.put("dias", dias);
        resultado.put("gdpKgDia", dias > 0 ? gananciaTotal.divide(BigDecimal.valueOf(dias), 3, RoundingMode.HALF_UP) : null);
        resultado.put("cantidadPesajes", historial.size());
        return resultado;
    }
}
