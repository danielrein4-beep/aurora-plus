package com.auroraplus.modules.retail.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.retail.entities.ProveedorRetail;
import com.auroraplus.modules.retail.repositories.ProveedorRetailRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/retail/proveedores")
public class ProveedorRetailController {

    @Autowired
    private ProveedorRetailRepository proveedorRetailRepository;

    @GetMapping
    public List<ProveedorRetail> listar() {
        return proveedorRetailRepository.findByTenantId(TenantContext.getCurrentTenant());
    }

    @PostMapping
    public ResponseEntity<ProveedorRetail> crear(@RequestParam Long tenantId, @RequestBody ProveedorRetail proveedor) {
        proveedor.setTenantId(tenantId);
        return ResponseEntity.ok(proveedorRetailRepository.save(proveedor));
    }
}
