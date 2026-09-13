package com.auroraplus.core.personal.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.personal.entities.Cargo;
import com.auroraplus.core.personal.entities.PermisoPersonal.RolPersonal;
import com.auroraplus.core.personal.repositories.CargoRepository;
import com.auroraplus.core.personal.services.PersonalAccessService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/personal/cargos")
public class CargoController {

    // Positivo, no "todo menos AUDITOR" (hallazgo de Codex: exigirNoAuditor dejaba pasar a
    // cualquier usuario SIN PermisoPersonal asignado, porque solo bloqueaba AUDITOR explícito).
    private static final Set<RolPersonal> PUEDEN_ESCRIBIR = EnumSet.of(RolPersonal.RRHH, RolPersonal.NOMINA);

    @Autowired
    private CargoRepository cargoRepository;

    @Autowired
    private PersonalAccessService accessService;

    @GetMapping
    public List<Cargo> listar() {
        Long tenantId = TenantContext.getCurrentTenant();
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_PERSONAL);
        accessService.exigirVerDirectorioPersonal(tenantId);
        return cargoRepository.findByTenantId(tenantId);
    }

    @PostMapping
    public Cargo crear(@RequestBody Cargo cargo) {
        Long tenantId = TenantContext.getCurrentTenant();
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_PERSONAL);
        accessService.exigirRol(tenantId, PUEDEN_ESCRIBIR);
        if (cargo.getNombre() == null || cargo.getNombre().isBlank()) {
            throw new RuntimeException("El nombre del cargo es obligatorio");
        }
        cargo.setTenantId(tenantId);
        cargo.setId(null);
        return cargoRepository.save(cargo);
    }
}
