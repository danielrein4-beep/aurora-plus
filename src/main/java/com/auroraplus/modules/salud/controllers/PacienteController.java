package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.entities.Paciente;
import com.auroraplus.modules.salud.services.PacienteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/salud/pacientes")
public class PacienteController {

    @Autowired
    private PacienteService pacienteService;

    @GetMapping
    public List<Paciente> listar(@RequestParam(required = false) String buscar) {
        return pacienteService.buscar(buscar);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Paciente> obtener(@PathVariable Long id) {
        return pacienteService.obtenerPorId(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/identificacion/{identificacion}")
    public ResponseEntity<Paciente> buscarPorIdentificacion(@PathVariable String identificacion) {
        return pacienteService.obtenerPorIdentificacion(identificacion)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Paciente> registrar(@RequestParam(required = false) Long tenantId, @RequestBody Paciente paciente) {
        Long tenantActivo = tenantId != null ? tenantId : TenantContext.getCurrentTenant();
        if (tenantActivo == null) {
            throw new RuntimeException("Tenant no identificado en la sesión");
        }
        return ResponseEntity.ok(pacienteService.registrarOActualizar(tenantActivo, paciente));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Paciente> actualizar(@PathVariable Long id, @RequestParam(required = false) Long tenantId, @RequestBody Paciente datos) {
        Long tenantActivo = tenantId != null ? tenantId : TenantContext.getCurrentTenant();
        datos.setId(id);
        return ResponseEntity.ok(pacienteService.registrarOActualizar(tenantActivo, datos));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        pacienteService.desactivar(id);
        return ResponseEntity.noContent().build();
    }
}
