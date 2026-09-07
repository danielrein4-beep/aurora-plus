package com.auroraplus.modules.horeca.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.horeca.entities.ProveedorHoreca;
import com.auroraplus.modules.horeca.repositories.ProveedorHorecaRepository;
import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/horeca/proveedores")
public class ProveedorHorecaController {

    @Autowired
    private ProveedorHorecaRepository proveedorHorecaRepository;

    @Autowired
    private EntityManager entityManager;

    // Mismo hallazgo de seguridad que ArticuloController/MesaController: sin
    // esto, findAll() devuelve proveedores de todos los tenants mezclados.
    @GetMapping
    public List<ProveedorHoreca> listar() {
        entityManager.unwrap(Session.class).enableFilter("tenantFilter")
            .setParameter("tenantId", TenantContext.getCurrentTenant());
        return proveedorHorecaRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<ProveedorHoreca> crear(@RequestParam Long tenantId, @RequestBody ProveedorHoreca proveedor) {
        proveedor.setTenantId(tenantId);
        return ResponseEntity.ok(proveedorHorecaRepository.save(proveedor));
    }
}
