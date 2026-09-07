package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.entities.ProcedimientoMedico;
import com.auroraplus.modules.salud.repositories.ProcedimientoMedicoRepository;
import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/salud/procedimientos")
public class ProcedimientoMedicoController {

    @Autowired
    private ProcedimientoMedicoRepository procedimientoMedicoRepository;

    @Autowired
    private EntityManager entityManager;

    // Ver hallazgo de seguridad en PacienteController — el filtro de tenant
    // del interceptor no llega vivo hasta esta query, hay que re-habilitarlo.
    private void asegurarFiltroTenant() {
        entityManager.unwrap(Session.class).enableFilter("tenantFilter")
            .setParameter("tenantId", TenantContext.getCurrentTenant());
    }

    @GetMapping
    public List<ProcedimientoMedico> listar() {
        asegurarFiltroTenant();
        return procedimientoMedicoRepository.findByActivoTrue();
    }

    @PostMapping
    public ResponseEntity<ProcedimientoMedico> crear(@RequestParam(required = false) Long tenantId, @RequestBody ProcedimientoMedico proc) {
        Long tenantActivo = tenantId != null ? tenantId : TenantContext.getCurrentTenant();
        proc.setTenantId(tenantActivo);
        return ResponseEntity.ok(procedimientoMedicoRepository.save(proc));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProcedimientoMedico> actualizar(@PathVariable Long id, @RequestBody ProcedimientoMedico datos) {
        return procedimientoMedicoRepository.findById(id).map(p -> {
            p.setNombre(datos.getNombre());
            p.setDescripcion(datos.getDescripcion());
            p.setCosto(datos.getCosto());
            p.setMoneda(datos.getMoneda());
            p.setDuracionMinutos(datos.getDuracionMinutos());
            return ResponseEntity.ok(procedimientoMedicoRepository.save(p));
        }).orElse(ResponseEntity.notFound().build());
    }
}
