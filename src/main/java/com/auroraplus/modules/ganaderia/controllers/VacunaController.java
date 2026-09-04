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

    @GetMapping
    public List<Vacuna> listar() {
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

    @PostMapping("/aplicar")
    public ResponseEntity<AplicacionVacuna> aplicar(@RequestParam Long tenantId, @RequestBody AplicacionRequest request) {
        return ResponseEntity.ok(ganaderiaSanidadService.aplicarVacuna(tenantId, request.animalId, request.vacunaId,
            request.fechaAplicacion, request.lote, request.veterinarioResponsable, request.costo));
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
