package com.auroraplus.modules.moda.controllers;

import com.auroraplus.modules.moda.entities.ProveedorModa;
import com.auroraplus.modules.moda.repositories.ProveedorModaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/moda/proveedores")
public class ProveedorModaController {

    @Autowired
    private ProveedorModaRepository proveedorModaRepository;

    @GetMapping
    public List<ProveedorModa> listar() {
        return proveedorModaRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<ProveedorModa> crear(@RequestParam Long tenantId, @RequestBody ProveedorModa proveedor) {
        proveedor.setTenantId(tenantId);
        return ResponseEntity.ok(proveedorModaRepository.save(proveedor));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProveedorModa> actualizar(@PathVariable Long id, @RequestBody ProveedorModa datos) {
        ProveedorModa proveedor = proveedorModaRepository.findById(id).orElseThrow(() -> new RuntimeException("Proveedor no encontrado"));
        proveedor.setNombre(datos.getNombre());
        proveedor.setRif(datos.getRif());
        proveedor.setTelefono(datos.getTelefono());
        proveedor.setContacto(datos.getContacto());
        proveedor.setDireccion(datos.getDireccion());
        proveedor.setActivo(datos.getActivo());
        return ResponseEntity.ok(proveedorModaRepository.save(proveedor));
    }
}
