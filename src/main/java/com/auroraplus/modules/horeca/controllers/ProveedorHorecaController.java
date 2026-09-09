package com.auroraplus.modules.horeca.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.horeca.entities.ProveedorHoreca;
import com.auroraplus.modules.horeca.repositories.ProveedorHorecaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/horeca/proveedores")
public class ProveedorHorecaController {

    @Autowired
    private ProveedorHorecaRepository proveedorHorecaRepository;

    // Hallazgo de seguridad corregido: en vez de depender del filtro de
    // Hibernate del TenantInterceptor (no siempre "vivo" en la sesión que
    // ejecuta el findAll(), ver MesaController), se pide el tenant explícito
    // al repositorio.
    @GetMapping
    public List<ProveedorHoreca> listar() {
        return proveedorHorecaRepository.findByTenantId(TenantContext.getCurrentTenant());
    }

    @PostMapping
    public ResponseEntity<ProveedorHoreca> crear(@RequestParam Long tenantId, @RequestBody ProveedorHoreca proveedor) {
        proveedor.setTenantId(tenantId);
        return ResponseEntity.ok(proveedorHorecaRepository.save(proveedor));
    }
}
