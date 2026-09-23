package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.RegistroPeso;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.RegistroPesoRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaTenantAccess;
import com.auroraplus.core.auth.AuthContext;
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
    public ResponseEntity<RegistroPeso> registrar(@RequestBody RegistroRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA", "ENCARGADO_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        if (request.animalId == null) throw new IllegalArgumentException("Debe indicar el animal");
        Animal animal = animalRepository.findForUpdateByIdAndTenantId(request.animalId, tenantId)
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
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

    @Autowired
    private com.auroraplus.modules.ganaderia.services.GanaderiaEngordeService engordeService;

    /** GDP de todos los animales activos de la finca (vista de Engorde). */
    @GetMapping("/resumen-engorde")
    public List<com.auroraplus.modules.ganaderia.services.GanaderiaEngordeService.FilaEngorde> resumenEngorde() {
        return engordeService.resumen(GanaderiaTenantAccess.requireTenant());
    }

    /** Corrige un pesaje mal digitado (peso y/o fecha); el peso de la ficha queda igual al último pesaje. */
    @PutMapping("/{id}")
    public ResponseEntity<RegistroPeso> editar(@PathVariable Long id, @RequestBody RegistroRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA");
        return ResponseEntity.ok(engordeService.editar(GanaderiaTenantAccess.requireTenant(), id, request.fecha, request.pesoKg));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA");
        engordeService.eliminar(GanaderiaTenantAccess.requireTenant(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/animal/{animalId}")
    public List<RegistroPeso> curvaAnimal(@PathVariable Long animalId) {
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        animalRepository.findById(animalId).filter(a -> tenantId.equals(a.getTenantId())).orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        return registroPesoRepository.findByAnimalIdOrderByFechaAsc(animalId);
    }

    /** GDP (ganancia diaria de peso) entre el primer y el último pesaje registrado — clave para decidir cuándo vender. */
    @GetMapping("/animal/{animalId}/gdp")
    public Map<String, Object> gananciaDiariaPeso(@PathVariable Long animalId) {
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        animalRepository.findById(animalId).filter(a -> tenantId.equals(a.getTenantId())).orElseThrow(() -> new RuntimeException("Animal no encontrado"));
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
