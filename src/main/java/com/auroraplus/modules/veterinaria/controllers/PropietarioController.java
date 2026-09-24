package com.auroraplus.modules.veterinaria.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.veterinaria.entities.Propietario;
import com.auroraplus.modules.veterinaria.services.PropietarioService;
import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/veterinaria/propietarios")
public class PropietarioController {

    @Autowired
    private PropietarioService propietarioService;

    @Autowired
    private EntityManager entityManager;

    private void asegurarFiltroTenant() {
        entityManager.unwrap(Session.class).enableFilter("tenantFilter")
            .setParameter("tenantId", TenantContext.getCurrentTenant());
    }

    @GetMapping
    public List<Propietario> listar(@RequestParam(required = false) String buscar) {
        Long tenantActivo = TenantContext.getCurrentTenant();
        asegurarFiltroTenant();
        return propietarioService.buscar(tenantActivo, buscar);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Propietario> obtener(@PathVariable Long id) {
        Long tenantActivo = TenantContext.getCurrentTenant();
        asegurarFiltroTenant();
        return propietarioService.obtenerPorId(tenantActivo, id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/identificacion/{identificacion}")
    public ResponseEntity<Propietario> buscarPorIdentificacion(@PathVariable String identificacion) {
        Long tenantActivo = TenantContext.getCurrentTenant();
        asegurarFiltroTenant();
        return propietarioService.obtenerPorIdentificacion(tenantActivo, identificacion)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Propietario> registrar(@RequestBody Propietario propietario) {
        Long tenantActivo = TenantContext.getCurrentTenant();
        if (tenantActivo == null) {
            throw new RuntimeException("Tenant no identificado en la sesión");
        }
        return ResponseEntity.ok(propietarioService.registrarOActualizar(tenantActivo, propietario));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Propietario> actualizar(@PathVariable Long id, @RequestBody Propietario datos) {
        Long tenantActivo = TenantContext.getCurrentTenant();
        datos.setId(id);
        return ResponseEntity.ok(propietarioService.registrarOActualizar(tenantActivo, datos));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        asegurarFiltroTenant();
        propietarioService.desactivar(id);
        return ResponseEntity.noContent().build();
    }
}
