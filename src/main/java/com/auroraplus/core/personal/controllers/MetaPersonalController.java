package com.auroraplus.core.personal.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.personal.entities.MetaPersonal;
import com.auroraplus.core.personal.entities.SeguimientoMeta;
import com.auroraplus.core.personal.services.MetaPersonalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/personal/metas")
public class MetaPersonalController {

    @Autowired
    private MetaPersonalService metaPersonalService;

    @PostMapping
    public MetaPersonal crear(@RequestBody MetaPersonal meta) {
        return metaPersonalService.crear(TenantContext.getCurrentTenant(), meta);
    }

    @GetMapping
    public List<MetaPersonal> listarTodas() {
        return metaPersonalService.listarTodas(TenantContext.getCurrentTenant());
    }

    @GetMapping("/empleado/{empleadoId}")
    public List<MetaPersonal> listarDeEmpleado(@PathVariable Long empleadoId) {
        return metaPersonalService.listarDeEmpleado(TenantContext.getCurrentTenant(), empleadoId);
    }

    @PostMapping("/{id}/seguimientos")
    public SeguimientoMeta registrarAvance(@PathVariable Long id, @RequestBody SeguimientoMeta seguimiento) {
        return metaPersonalService.registrarAvance(TenantContext.getCurrentTenant(), id, seguimiento);
    }
}
