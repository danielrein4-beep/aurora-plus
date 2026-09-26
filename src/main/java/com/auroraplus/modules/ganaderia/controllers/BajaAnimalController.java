package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import com.auroraplus.modules.ganaderia.entities.BajaAnimal;
import com.auroraplus.modules.ganaderia.repositories.BajaAnimalRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaTenantAccess;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/** Mortalidad/bajas: marca el animal como MUERTO y deja constancia del motivo — control sanitario y de pérdidas. */
@RestController
@RequestMapping("/api/ganaderia/bajas")
public class BajaAnimalController {

    @Autowired
    private BajaAnimalRepository bajaAnimalRepository;

    @Autowired
    private com.auroraplus.modules.ganaderia.services.GanaderiaAnimalService animalService;

    @Autowired
    private RegistroAuditoriaService auditoriaService;

    public static class BajaRequest {
        public Long animalId;
        public LocalDate fecha;
        public String motivo;
        public String observaciones;
    }

    // ── P0: tenant NUNCA viene por query/body/header — siempre de TenantContext/JWT ──

    @GetMapping
    public List<BajaAnimal> listar() {
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        return bajaAnimalRepository.findByTenantId(tenantId);
    }

    @PostMapping
    public ResponseEntity<BajaAnimal> registrar(@RequestBody BajaRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA", "ENCARGADO_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        BajaAnimal guardada = animalService.registrarBaja(tenantId, request.animalId, request.fecha, request.motivo, request.observaciones);
        auditoriaService.registrar(tenantId, "GANADERIA", "ELIMINAR", "Animal", guardada.getAnimal().getId(),
            "Registró baja del animal " + guardada.getAnimal().getArete() + " — motivo: " + guardada.getMotivo());
        return ResponseEntity.ok(guardada);
    }
}
