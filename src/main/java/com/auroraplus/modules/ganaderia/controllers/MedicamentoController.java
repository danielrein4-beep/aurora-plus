package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.AplicacionMedicamento;
import com.auroraplus.modules.ganaderia.entities.Medicamento;
import com.auroraplus.modules.ganaderia.repositories.AplicacionMedicamentoRepository;
import com.auroraplus.modules.ganaderia.repositories.MedicamentoRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaSanidadService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/ganaderia/medicamentos")
public class MedicamentoController {

    @Autowired
    private MedicamentoRepository medicamentoRepository;

    @Autowired
    private AplicacionMedicamentoRepository aplicacionMedicamentoRepository;

    @Autowired
    private GanaderiaSanidadService ganaderiaSanidadService;

    @GetMapping
    public List<Medicamento> listar() {
        return medicamentoRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<Medicamento> crear(@RequestParam Long tenantId, @RequestBody Medicamento medicamento) {
        medicamento.setTenantId(tenantId);
        return ResponseEntity.ok(medicamentoRepository.save(medicamento));
    }

    public static class AplicacionRequest {
        public Long animalId;
        public Long medicamentoId;
        public LocalDate fechaAplicacion;
        public String dosis;
        public String motivoDiagnostico;
        public String veterinarioResponsable;
        public BigDecimal costo;
    }

    @PostMapping("/aplicar")
    public ResponseEntity<AplicacionMedicamento> aplicar(@RequestParam Long tenantId, @RequestBody AplicacionRequest request) {
        return ResponseEntity.ok(ganaderiaSanidadService.aplicarMedicamento(tenantId, request.animalId, request.medicamentoId,
            request.fechaAplicacion, request.dosis, request.motivoDiagnostico, request.veterinarioResponsable, request.costo));
    }

    @GetMapping("/animal/{animalId}")
    public List<AplicacionMedicamento> historialAnimal(@PathVariable Long animalId) {
        return aplicacionMedicamentoRepository.findByAnimalIdOrderByFechaAplicacionDesc(animalId);
    }
}
