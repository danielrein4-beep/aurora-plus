package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.modules.ganaderia.entities.SociedadCeba;
import com.auroraplus.modules.ganaderia.services.GanaderiaSociedadCebaService;
import com.auroraplus.modules.ganaderia.services.GanaderiaSociedadCebaService.DatosSociedad;
import com.auroraplus.modules.ganaderia.services.GanaderiaSociedadCebaService.ResumenSociedad;
import com.auroraplus.modules.ganaderia.services.GanaderiaTenantAccess;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Ceba en sociedad: acuerdos con socios, sus animales y la liquidación de kilos ganados. */
@RestController
@RequestMapping("/api/ganaderia/sociedades")
public class SociedadCebaController {

    private static final String[] ROLES_GESTION = {"DUENO_ADMIN", "ADMINISTRADOR_FINCA"};

    @Autowired
    private GanaderiaSociedadCebaService service;

    @GetMapping
    public List<ResumenSociedad> listar() {
        return service.listar(GanaderiaTenantAccess.requireTenant());
    }

    @GetMapping("/{id}")
    public ResumenSociedad detalle(@PathVariable Long id) {
        return service.detalle(GanaderiaTenantAccess.requireTenant(), id);
    }

    @PostMapping
    public ResponseEntity<SociedadCeba> crear(@RequestBody DatosSociedad datos) {
        AuthContext.exigirRol(ROLES_GESTION);
        return ResponseEntity.ok(service.crear(GanaderiaTenantAccess.requireTenant(), datos));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SociedadCeba> editar(@PathVariable Long id, @RequestBody DatosSociedad datos) {
        AuthContext.exigirRol(ROLES_GESTION);
        return ResponseEntity.ok(service.editar(GanaderiaTenantAccess.requireTenant(), id, datos));
    }

    public static class AsignarRequest {
        public List<Long> animalIds;
        public LocalDate fechaEntrada;
    }

    @PostMapping("/{id}/animales")
    public Map<String, Object> asignar(@PathVariable Long id, @RequestBody AsignarRequest req) {
        AuthContext.exigirRol(ROLES_GESTION);
        int n = service.asignarAnimales(GanaderiaTenantAccess.requireTenant(), id, req.animalIds, req.fechaEntrada);
        return Map.of("asignados", n);
    }

    public static class PesoEntradaRequest {
        public BigDecimal pesoEntrada;
    }

    @PutMapping("/{id}/animales/{animalId}")
    public ResponseEntity<Void> corregirPesoEntrada(@PathVariable Long id, @PathVariable Long animalId, @RequestBody PesoEntradaRequest req) {
        AuthContext.exigirRol(ROLES_GESTION);
        service.corregirPesoEntrada(GanaderiaTenantAccess.requireTenant(), id, animalId, req.pesoEntrada);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/animales/{animalId}")
    public ResponseEntity<Void> quitar(@PathVariable Long id, @PathVariable Long animalId) {
        AuthContext.exigirRol(ROLES_GESTION);
        service.quitarAnimal(GanaderiaTenantAccess.requireTenant(), id, animalId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/cerrar")
    public ResponseEntity<SociedadCeba> cerrar(@PathVariable Long id) {
        AuthContext.exigirRol(ROLES_GESTION);
        return ResponseEntity.ok(service.cerrar(GanaderiaTenantAccess.requireTenant(), id));
    }
}
