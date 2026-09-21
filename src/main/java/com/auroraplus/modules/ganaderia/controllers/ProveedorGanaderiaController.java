package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.modules.ganaderia.entities.ProveedorGanaderia;
import com.auroraplus.modules.ganaderia.repositories.ProveedorGanaderiaRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaTenantAccess;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ganaderia/proveedores")
public class ProveedorGanaderiaController {

    @Autowired
    private ProveedorGanaderiaRepository proveedorGanaderiaRepository;

    @GetMapping
    public List<ProveedorGanaderia> listar() {
        return proveedorGanaderiaRepository.findByTenantId(GanaderiaTenantAccess.requireTenant());
    }

    @PostMapping
    public ResponseEntity<ProveedorGanaderia> crear(@RequestBody ProveedorGanaderia proveedor) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        proveedor.setId(null);
        proveedor.setTenantId(tenantId);
        return ResponseEntity.ok(proveedorGanaderiaRepository.save(proveedor));
    }
}
