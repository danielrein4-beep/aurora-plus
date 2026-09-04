package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.RegistroOrdeno;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
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

@RestController
@RequestMapping("/api/ganaderia/ordeno")
public class RegistroOrdenoController {

    @Autowired
    private RegistroOrdenoRepository registroOrdenoRepository;

    @Autowired
    private AnimalRepository animalRepository;

    public static class RegistroRequest {
        public Long animalId;
        public LocalDate fecha;
        public String turno;
        public BigDecimal cantidadLitros;
        public BigDecimal porcentajeGrasa;
        public BigDecimal porcentajeProteina;
    }

    @PostMapping
    public ResponseEntity<RegistroOrdeno> registrar(@RequestParam Long tenantId, @RequestBody RegistroRequest request) {
        Animal animal = animalRepository.findById(request.animalId)
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        if (!animal.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Animal no pertenece a este tenant");
        }
        if (request.cantidadLitros == null || request.cantidadLitros.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("La cantidad de litros debe ser mayor a cero");
        }

        RegistroOrdeno registro = new RegistroOrdeno();
        registro.setTenantId(tenantId);
        registro.setAnimal(animal);
        registro.setFecha(request.fecha != null ? request.fecha : LocalDate.now());
        registro.setTurno(request.turno);
        registro.setCantidadLitros(request.cantidadLitros);
        registro.setPorcentajeGrasa(request.porcentajeGrasa);
        registro.setPorcentajeProteina(request.porcentajeProteina);

        return ResponseEntity.ok(registroOrdenoRepository.save(registro));
    }

    @GetMapping("/animal/{animalId}")
    public List<RegistroOrdeno> historialAnimal(@PathVariable Long animalId) {
        return registroOrdenoRepository.findByAnimalIdOrderByFechaDesc(animalId);
    }

    /** Reporte de producción total del hato en un rango de fechas. */
    @GetMapping("/reporte")
    public Map<String, Object> reporte(@RequestParam Long tenantId, @RequestParam LocalDate desde, @RequestParam LocalDate hasta) {
        List<RegistroOrdeno> registros = registroOrdenoRepository.findByTenantIdAndFechaBetween(tenantId, desde, hasta);
        BigDecimal totalLitros = registros.stream()
            .map(RegistroOrdeno::getCantidadLitros)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);

        Map<String, Object> resultado = new LinkedHashMap<>();
        resultado.put("desde", desde);
        resultado.put("hasta", hasta);
        resultado.put("totalLitros", totalLitros);
        resultado.put("cantidadRegistros", registros.size());
        resultado.put("registros", registros);
        return resultado;
    }
}
