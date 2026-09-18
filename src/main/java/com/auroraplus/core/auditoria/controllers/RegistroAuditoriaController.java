package com.auroraplus.core.auditoria.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auditoria.entities.RegistroAuditoria;
import com.auroraplus.core.auditoria.repositories.RegistroAuditoriaRepository;
import com.auroraplus.core.config.TenantContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Solo el Dueño/Administrador del tenant puede ver la bitácora de auditoría —
 * es información sobre lo que hizo CADA usuario, incluyendo a otros con roles
 * distintos, así que no se expone a nadie más.
 */
@RestController
@RequestMapping("/api/auditoria")
public class RegistroAuditoriaController {

    @Autowired
    private RegistroAuditoriaRepository registroAuditoriaRepository;

    @GetMapping
    public ResponseEntity<Page<RegistroAuditoria>> listar(
            @RequestParam(required = false) String modulo,
            @RequestParam(required = false) String accion,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "50") int tamano) {
        AuthContext.exigirRol("DUENO_ADMIN");
        Long tenantId = TenantContext.getCurrentTenant();
        Pageable pageable = PageRequest.of(pagina, Math.min(tamano, 200), Sort.by(Sort.Direction.DESC, "fecha"));

        Page<RegistroAuditoria> resultado;
        if (modulo != null && !modulo.isBlank() && accion != null && !accion.isBlank()) {
            resultado = registroAuditoriaRepository.findByTenantIdAndModuloAndAccionOrderByFechaDesc(tenantId, modulo, accion, pageable);
        } else if (modulo != null && !modulo.isBlank()) {
            resultado = registroAuditoriaRepository.findByTenantIdAndModuloOrderByFechaDesc(tenantId, modulo, pageable);
        } else if (accion != null && !accion.isBlank()) {
            resultado = registroAuditoriaRepository.findByTenantIdAndAccionOrderByFechaDesc(tenantId, accion, pageable);
        } else {
            resultado = registroAuditoriaRepository.findByTenantIdOrderByFechaDesc(tenantId, pageable);
        }
        return ResponseEntity.ok(resultado);
    }
}
