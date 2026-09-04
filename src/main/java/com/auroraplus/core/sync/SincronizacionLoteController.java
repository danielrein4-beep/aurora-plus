package com.auroraplus.core.sync;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoint único que un POS offline usa al reconectar para mandar TODAS las
 * ventas que acumuló localmente en una sola petición — ver SincronizacionLoteService.
 * Siempre responde 200 con el detalle de cada operación (éxito/fallo/ya
 * procesada); nunca falla la petición completa por un ítem malo.
 */
@RestController
@RequestMapping("/api/sync")
public class SincronizacionLoteController {

    @Autowired
    private SincronizacionLoteService sincronizacionLoteService;

    public static class LoteRequest {
        public List<SincronizacionLoteService.OperacionLote> operaciones;
    }

    @PostMapping("/lote")
    public ResponseEntity<List<SincronizacionLoteService.ResultadoOperacionLote>> procesarLote(
            @RequestParam Long tenantId, @RequestBody LoteRequest request) {
        if (request.operaciones == null || request.operaciones.isEmpty()) {
            throw new RuntimeException("El lote debe traer al menos una operación");
        }
        return ResponseEntity.ok(sincronizacionLoteService.procesarLote(tenantId, request.operaciones));
    }
}
