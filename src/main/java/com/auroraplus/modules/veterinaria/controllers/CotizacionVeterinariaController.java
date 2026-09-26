package com.auroraplus.modules.veterinaria.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.veterinaria.entities.CotizacionVeterinaria;
import com.auroraplus.modules.veterinaria.services.CotizacionVeterinariaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/veterinaria/cotizaciones")
public class CotizacionVeterinariaController {

    @Autowired
    private CotizacionVeterinariaService cotizacionVeterinariaService;

    @GetMapping
    public List<CotizacionVeterinaria> listar() {
        return cotizacionVeterinariaService.listar();
    }

    @GetMapping("/mascota/{mascotaId}")
    public List<CotizacionVeterinaria> listarPorMascota(@PathVariable Long mascotaId) {
        return cotizacionVeterinariaService.listarPorMascota(mascotaId);
    }

    @PostMapping
    public ResponseEntity<CotizacionVeterinaria> crear(
            @RequestBody CotizacionVeterinaria cotizacion) {
        Long tenantActivo = TenantContext.getCurrentTenant();
        if (tenantActivo == null) {
            throw new RuntimeException("Tenant no identificado en la sesión");
        }
        return ResponseEntity.ok(cotizacionVeterinariaService.crear(tenantActivo, cotizacion));
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<CotizacionVeterinaria> actualizarEstado(
            @PathVariable Long id,
            @RequestParam CotizacionVeterinaria.EstadoCotizacion estado) {
        return ResponseEntity.ok(cotizacionVeterinariaService.actualizarEstado(id, estado));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        cotizacionVeterinariaService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
