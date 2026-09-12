package com.auroraplus.modules.repuestos.controllers;

import com.auroraplus.modules.repuestos.entities.OrdenCompraSugerida;
import com.auroraplus.modules.repuestos.repositories.OrdenCompraSugeridaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Bandeja de borradores de orden de compra generados por Smart Restocking (ver OrdenCompraSugeridaService). */
@RestController
@RequestMapping("/api/repuestos/ordenes-compra-sugeridas")
public class OrdenCompraSugeridaController {

    @Autowired
    private OrdenCompraSugeridaRepository ordenCompraSugeridaRepository;

    @GetMapping
    public List<OrdenCompraSugerida> listar(@RequestParam Long tenantId) {
        return ordenCompraSugeridaRepository.findByTenantIdOrderByFechaCreacionDesc(tenantId);
    }

    public static class DecisionRequest {
        public OrdenCompraSugerida.Estado estado; // APROBADA o RECHAZADA
    }

    /** El administrador aprueba o rechaza el borrador — nunca se dispara nada automático desde acá todavía. */
    @PatchMapping("/{id}")
    public ResponseEntity<OrdenCompraSugerida> decidir(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody DecisionRequest request) {
        if (request.estado != OrdenCompraSugerida.Estado.APROBADA && request.estado != OrdenCompraSugerida.Estado.RECHAZADA) {
            throw new RuntimeException("Solo se puede aprobar o rechazar un borrador");
        }
        OrdenCompraSugerida orden = ordenCompraSugeridaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Borrador no encontrado"));
        if (!orden.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: el borrador no pertenece a este tenant");
        }
        orden.setEstado(request.estado);
        return ResponseEntity.ok(ordenCompraSugeridaRepository.save(orden));
    }
}
