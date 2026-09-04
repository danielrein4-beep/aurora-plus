package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.ProveedorGanaderia;
import com.auroraplus.modules.ganaderia.repositories.ProveedorGanaderiaRepository;
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
        return proveedorGanaderiaRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<ProveedorGanaderia> crear(@RequestParam Long tenantId, @RequestBody ProveedorGanaderia proveedor) {
        proveedor.setTenantId(tenantId);
        return ResponseEntity.ok(proveedorGanaderiaRepository.save(proveedor));
    }
}
