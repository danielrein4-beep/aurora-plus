package com.auroraplus.modules.repuestos.controllers;

import com.auroraplus.modules.repuestos.entities.ProveedorRepuesto;
import com.auroraplus.modules.repuestos.repositories.ProveedorRepuestoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/repuestos/proveedores")
public class ProveedorRepuestoController {

    @Autowired
    private ProveedorRepuestoRepository proveedorRepuestoRepository;

    @GetMapping
    public List<ProveedorRepuesto> listar() {
        return proveedorRepuestoRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<ProveedorRepuesto> crear(@RequestParam Long tenantId, @RequestBody ProveedorRepuesto proveedor) {
        if (proveedor.getNombre() == null || proveedor.getNombre().isBlank()) {
            throw new RuntimeException("El nombre del proveedor es obligatorio");
        }
        proveedor.setTenantId(tenantId);
        if (proveedor.getActivo() == null) proveedor.setActivo(true);
        return ResponseEntity.status(HttpStatus.CREATED).body(proveedorRepuestoRepository.save(proveedor));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProveedorRepuesto> actualizar(@PathVariable Long id, @RequestBody ProveedorRepuesto datos) {
        return proveedorRepuestoRepository.findById(id)
            .map(p -> {
                if (datos.getNombre() != null) p.setNombre(datos.getNombre());
                if (datos.getRif() != null) p.setRif(datos.getRif());
                if (datos.getTelefono() != null) p.setTelefono(datos.getTelefono());
                if (datos.getContacto() != null) p.setContacto(datos.getContacto());
                if (datos.getDireccion() != null) p.setDireccion(datos.getDireccion());
                if (datos.getActivo() != null) p.setActivo(datos.getActivo());
                return ResponseEntity.ok(proveedorRepuestoRepository.save(p));
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
