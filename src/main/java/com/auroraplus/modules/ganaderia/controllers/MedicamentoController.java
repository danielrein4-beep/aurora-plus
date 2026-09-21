package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.modules.ganaderia.entities.AplicacionMedicamento;
import com.auroraplus.modules.ganaderia.entities.Medicamento;
import com.auroraplus.modules.ganaderia.repositories.AplicacionMedicamentoRepository;
import com.auroraplus.modules.ganaderia.repositories.MedicamentoRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaSanidadService;
import com.auroraplus.modules.ganaderia.services.GanaderiaTenantAccess;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
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

    @Autowired
    private AnimalRepository animalRepository;

    @GetMapping
    public List<Medicamento> listar() {
        return medicamentoRepository.findByTenantId(GanaderiaTenantAccess.requireTenant());
    }

    @PostMapping
    public ResponseEntity<Medicamento> crear(@RequestBody Medicamento medicamento) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA", "ENCARGADO_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        medicamento.setId(null);
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
    public ResponseEntity<AplicacionMedicamento> aplicar(@RequestBody AplicacionRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA", "ENCARGADO_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        return ResponseEntity.ok(ganaderiaSanidadService.aplicarMedicamento(tenantId, request.animalId, request.medicamentoId,
            request.fechaAplicacion, request.dosis, request.motivoDiagnostico, request.veterinarioResponsable, request.costo));
    }

    @GetMapping("/animal/{animalId}")
    public List<AplicacionMedicamento> historialAnimal(@PathVariable Long animalId) {
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        animalRepository.findById(animalId).filter(a -> tenantId.equals(a.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        return aplicacionMedicamentoRepository.findByAnimalIdOrderByFechaAplicacionDesc(animalId);
    }
}
