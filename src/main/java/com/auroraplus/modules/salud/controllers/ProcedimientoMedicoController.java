package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.salud.entities.ProcedimientoMedico;
import com.auroraplus.modules.salud.repositories.ProcedimientoMedicoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/salud/procedimientos")
public class ProcedimientoMedicoController {

    @Autowired
    private ProcedimientoMedicoRepository procedimientoMedicoRepository;

    @GetMapping
    public List<ProcedimientoMedico> listar() {
        return procedimientoMedicoRepository.findByActivoTrue();
    }

    @PostMapping
    public ResponseEntity<ProcedimientoMedico> crear(@RequestParam(required = false) Long tenantId, @RequestBody ProcedimientoMedico proc) {
        Long tenantActivo = tenantId != null ? tenantId : TenantContext.getCurrentTenant();
        proc.setTenantId(tenantActivo);
        return ResponseEntity.ok(procedimientoMedicoRepository.save(proc));
    }

    // findById() no respeta el filtro de tenant (ver hallazgo de seguridad en
    // ConsultaMedicaService) — sin este chequeo, cualquier clínica podía
    // modificar el precio/nombre de un procedimiento de OTRA clínica.
    @PutMapping("/{id}")
    public ResponseEntity<ProcedimientoMedico> actualizar(@PathVariable Long id, @RequestBody ProcedimientoMedico datos) {
        Long tenantId = TenantContext.getCurrentTenant();
        return procedimientoMedicoRepository.findById(id)
            .filter(p -> tenantId != null && tenantId.equals(p.getTenantId()))
            .map(p -> {
            p.setNombre(datos.getNombre());
            p.setDescripcion(datos.getDescripcion());
            p.setCosto(datos.getCosto());
            p.setMoneda(datos.getMoneda());
            p.setDuracionMinutos(datos.getDuracionMinutos());
            return ResponseEntity.ok(procedimientoMedicoRepository.save(p));
        }).orElse(ResponseEntity.notFound().build());
    }
}
