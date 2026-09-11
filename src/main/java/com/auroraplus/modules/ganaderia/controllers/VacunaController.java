package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.AplicacionVacuna;
import com.auroraplus.modules.ganaderia.entities.Vacuna;
import com.auroraplus.modules.ganaderia.repositories.AplicacionVacunaRepository;
import com.auroraplus.modules.ganaderia.repositories.VacunaRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaSanidadService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/ganaderia/vacunas")
public class VacunaController {

    @Autowired
    private VacunaRepository vacunaRepository;

    @Autowired
    private AplicacionVacunaRepository aplicacionVacunaRepository;

    @Autowired
    private GanaderiaSanidadService ganaderiaSanidadService;

    @Autowired
    private com.auroraplus.modules.ganaderia.repositories.AnimalRepository animalRepository;

    @GetMapping
    public List<Vacuna> listar(@RequestParam(required = false) Long tenantId) {
        // Si se indica tenantId, SIEMPRE se respeta ese filtro (incluso si el
        // catálogo del tenant está vacío) — nunca caer a findAll(), que
        // devolvería el catálogo de TODOS los tenants mezclado.
        if (tenantId != null) {
            return vacunaRepository.findByTenantId(tenantId);
        }
        return vacunaRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<Vacuna> crear(@RequestParam Long tenantId, @RequestBody Vacuna vacuna) {
        vacuna.setTenantId(tenantId);
        return ResponseEntity.ok(vacunaRepository.save(vacuna));
    }

    public static class AplicacionRequest {
        public Long animalId;
        public Long vacunaId;
        public LocalDate fechaAplicacion;
        public String lote;
        public String veterinarioResponsable;
        public BigDecimal costo;
    }

    public static class AplicacionLoteRequest {
        public List<Long> animalIds;
        public Long vacunaId;
        public LocalDate fechaAplicacion;
        public String lote;
        public String veterinarioResponsable;
        public BigDecimal costo;
    }

    @PostMapping("/aplicar")
    public ResponseEntity<AplicacionVacuna> aplicar(@RequestParam Long tenantId, @RequestBody AplicacionRequest request) {
        return ResponseEntity.ok(ganaderiaSanidadService.aplicarVacuna(tenantId, request.animalId, request.vacunaId,
            request.fechaAplicacion, request.lote, request.veterinarioResponsable, request.costo));
    }

    /**
     * Aplicación masiva de vacuna / tratamiento en lote.
     * VERIFICA ESTRICTAMENTE CADA ANIMALID CONTRA EL TENANTID PARA PREVENIR ACCESO CRUZADO (IDOR).
     */
    @PostMapping("/aplicar-lote")
    public ResponseEntity<List<AplicacionVacuna>> aplicarLote(@RequestParam Long tenantId, @RequestBody AplicacionLoteRequest request) {
        if (request.animalIds == null || request.animalIds.isEmpty()) {
            throw new RuntimeException("Debe seleccionar al menos un animal para aplicar el tratamiento");
        }
        if (request.vacunaId == null) {
            throw new RuntimeException("Debe seleccionar una vacuna válida del catálogo");
        }

        // 1. Verificación de la vacuna contra el tenant
        Vacuna vacuna = vacunaRepository.findById(request.vacunaId)
            .orElseThrow(() -> new RuntimeException("Vacuna no encontrada en el catálogo"));
        if (vacuna.getTenantId() != null && !vacuna.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: La vacuna no pertenece a este tenant");
        }

        // 2. Verificación estricta de CADA animalId contra el tenantId
        for (Long animalId : request.animalIds) {
            com.auroraplus.modules.ganaderia.entities.Animal animal = animalRepository.findById(animalId)
                .orElseThrow(() -> new RuntimeException("Animal con ID " + animalId + " no encontrado"));
            if (!animal.getTenantId().equals(tenantId)) {
                throw new RuntimeException("Violación de seguridad: El animal arete " + animal.getArete() 
                    + " (ID " + animalId + ") no pertenece al tenant actual");
            }
        }

        // 3. Aplicar fidedignamente con cálculo exacto de días de retiro
        List<AplicacionVacuna> resultado = new java.util.ArrayList<>();
        LocalDate fecha = request.fechaAplicacion != null ? request.fechaAplicacion : LocalDate.now();
        BigDecimal costoPorAnimal = (request.costo != null && !request.animalIds.isEmpty())
            ? request.costo.divide(BigDecimal.valueOf(request.animalIds.size()), 2, java.math.RoundingMode.HALF_UP)
            : request.costo;

        for (Long animalId : request.animalIds) {
            AplicacionVacuna aplicacion = ganaderiaSanidadService.aplicarVacuna(
                tenantId,
                animalId,
                request.vacunaId,
                fecha,
                request.lote,
                request.veterinarioResponsable,
                costoPorAnimal
            );
            resultado.add(aplicacion);
        }

        return ResponseEntity.ok(resultado);
    }

    @GetMapping("/animal/{animalId}")
    public List<AplicacionVacuna> historialAnimal(@PathVariable Long animalId) {
        return aplicacionVacunaRepository.findByAnimalIdOrderByFechaAplicacionDesc(animalId);
    }

    @GetMapping("/refuerzos-pendientes")
    public List<AplicacionVacuna> refuerzosPendientes(@RequestParam Long tenantId,
                                                        @RequestParam(required = false) LocalDate desde,
                                                        @RequestParam(required = false) LocalDate hasta) {
        LocalDate d = desde != null ? desde : LocalDate.now();
        LocalDate h = hasta != null ? hasta : LocalDate.now().plusDays(30);
        return aplicacionVacunaRepository.findRefuerzosPendientes(tenantId, d, h);
    }
}
