package com.auroraplus.modules.construccion.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.construccion.entities.*;
import com.auroraplus.modules.construccion.services.ConstruccionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/construccion")
public class ConstruccionController {

    @Autowired
    private ConstruccionService construccionService;

    private Long requireTenant() {
        Long tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado en TenantContext");
        }
        return tenantId;
    }

    // --- PROYECTOS ---
    @GetMapping("/proyectos")
    public List<ProyectoConstruccionEntity> listarProyectos() {
        return construccionService.listarProyectos(requireTenant());
    }

    @PostMapping("/proyectos")
    public ResponseEntity<ProyectoConstruccionEntity> crearProyecto(@RequestBody ProyectoConstruccionEntity proyecto) {
        return ResponseEntity.ok(construccionService.guardarProyecto(requireTenant(), proyecto));
    }

    @GetMapping("/proyectos/{id}")
    public ResponseEntity<ProyectoConstruccionEntity> obtenerProyecto(@PathVariable Long id) {
        return construccionService.obtenerProyecto(requireTenant(), id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/proyectos/{id}")
    public ResponseEntity<ProyectoConstruccionEntity> actualizarProyecto(
            @PathVariable Long id,
            @RequestBody ProyectoConstruccionEntity proyecto) {
        return ResponseEntity.ok(construccionService.actualizarProyecto(requireTenant(), id, proyecto));
    }

    @DeleteMapping("/proyectos/{id}")
    public ResponseEntity<Void> eliminarProyecto(@PathVariable Long id) {
        construccionService.eliminarProyecto(requireTenant(), id);
        return ResponseEntity.noContent().build();
    }

    // --- CAPÍTULOS ---
    @GetMapping("/capitulos")
    public List<CapituloConstruccionEntity> listarCapitulos() {
        return construccionService.listarCapitulos(requireTenant());
    }

    @PostMapping("/capitulos")
    public ResponseEntity<CapituloConstruccionEntity> crearCapitulo(@RequestBody CapituloConstruccionEntity capitulo) {
        return ResponseEntity.ok(construccionService.guardarCapitulo(requireTenant(), capitulo));
    }

    @GetMapping("/proyectos/{proyectoId}/capitulos")
    public List<CapituloConstruccionEntity> listarCapitulosPorProyecto(@PathVariable Long proyectoId) {
        return construccionService.listarCapitulosPorProyecto(requireTenant(), proyectoId);
    }

    @PostMapping("/proyectos/{proyectoId}/capitulos")
    public ResponseEntity<CapituloConstruccionEntity> crearCapituloEnProyecto(
            @PathVariable Long proyectoId,
            @RequestBody CapituloConstruccionEntity capitulo) {
        return ResponseEntity.ok(construccionService.guardarCapituloEnProyecto(requireTenant(), proyectoId, capitulo));
    }

    // --- PARTIDAS ---
    @GetMapping("/proyectos/{proyectoId}/partidas")
    public List<PartidaConstruccionEntity> listarPartidas(@PathVariable Long proyectoId) {
        return construccionService.listarPartidas(requireTenant(), proyectoId);
    }

    @PostMapping("/proyectos/{proyectoId}/partidas")
    public ResponseEntity<PartidaConstruccionEntity> crearPartida(
            @PathVariable Long proyectoId,
            @RequestBody PartidaConstruccionEntity partida) {
        return ResponseEntity.ok(construccionService.guardarPartida(requireTenant(), proyectoId, partida));
    }

    @DeleteMapping("/partidas/{id}")
    public ResponseEntity<Void> eliminarPartida(@PathVariable Long id) {
        construccionService.eliminarPartida(requireTenant(), id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/partidas/{id}")
    public ResponseEntity<PartidaConstruccionEntity> actualizarPartida(
            @PathVariable Long id,
            @RequestBody PartidaConstruccionEntity partida) {
        return ResponseEntity.ok(construccionService.actualizarPartida(requireTenant(), id, partida));
    }

    // --- VALUACIONES ---
    @GetMapping("/proyectos/{proyectoId}/valuaciones")
    public List<ValuacionConstruccionEntity> listarValuaciones(@PathVariable Long proyectoId) {
        return construccionService.listarValuaciones(requireTenant(), proyectoId);
    }

    public ResponseEntity<ValuacionConstruccionEntity> crearValuacion(Long proyectoId, ValuacionConstruccionEntity valuacion) {
        return crearValuacion(proyectoId, valuacion, null);
    }

    @PostMapping("/proyectos/{proyectoId}/valuaciones")
    public ResponseEntity<ValuacionConstruccionEntity> crearValuacion(
            @PathVariable Long proyectoId,
            @RequestBody ValuacionConstruccionEntity valuacion,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        return ResponseEntity.ok(construccionService.guardarValuacion(requireTenant(), proyectoId, valuacion, idempotencyKey));
    }

    @PatchMapping("/valuaciones/{id}/estado")
    public ResponseEntity<ValuacionConstruccionEntity> cambiarEstadoValuacion(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String estado = body != null ? body.get("estado") : null;
        if (estado == null || estado.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El campo 'estado' es obligatorio");
        }
        return construccionService.actualizarEstadoValuacion(requireTenant(), id, estado)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // --- INSUMOS ---
    @GetMapping("/insumos")
    public List<InsumoConstruccionEntity> listarInsumos() {
        return construccionService.listarInsumos(requireTenant());
    }

    @PostMapping("/insumos")
    public ResponseEntity<InsumoConstruccionEntity> crearInsumo(@RequestBody InsumoConstruccionEntity insumo) {
        return ResponseEntity.ok(construccionService.guardarInsumo(requireTenant(), insumo));
    }

    public ResponseEntity<InsumoConstruccionEntity> registrarConsumo(Long id, Map<String, BigDecimal> body) {
        return registrarConsumo(id, body, null);
    }

    @PostMapping("/insumos/{id}/consumo")
    public ResponseEntity<InsumoConstruccionEntity> registrarConsumo(
            @PathVariable Long id,
            @RequestBody Map<String, BigDecimal> body,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        BigDecimal cantidad = body != null ? body.get("cantidad") : null;
        if (cantidad == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El campo 'cantidad' es obligatorio");
        }
        return ResponseEntity.ok(construccionService.registrarConsumoInsumo(requireTenant(), id, cantidad, idempotencyKey));
    }

    // --- BITÁCORA ---
    @GetMapping("/proyectos/{proyectoId}/bitacora")
    public List<BitacoraConstruccionEntity> listarBitacora(@PathVariable Long proyectoId) {
        return construccionService.listarBitacora(requireTenant(), proyectoId);
    }

    public ResponseEntity<BitacoraConstruccionEntity> agregarBitacora(Long proyectoId, BitacoraConstruccionEntity entrada) {
        return agregarBitacora(proyectoId, entrada, null);
    }

    @PostMapping("/proyectos/{proyectoId}/bitacora")
    public ResponseEntity<BitacoraConstruccionEntity> agregarBitacora(
            @PathVariable Long proyectoId,
            @RequestBody BitacoraConstruccionEntity entrada,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        return ResponseEntity.ok(construccionService.agregarEntradaBitacora(requireTenant(), proyectoId, entrada, idempotencyKey));
    }

    // --- CATÁLOGO COVENIN (PÚBLICO) ---
    @GetMapping("/catalogo-covenin")
    public List<CatalogoCoveninEntity> buscarCatalogo(@RequestParam(required = false) String q) {
        return construccionService.buscarCatalogo(q);
    }

    // --- LOGÍSTICA Y DESPACHOS ---
    @GetMapping("/proyectos/{proyectoId}/despachos")
    public List<DespachoConstruccionEntity> listarDespachos(@PathVariable Long proyectoId) {
        return construccionService.listarDespachos(requireTenant(), proyectoId);
    }

    @GetMapping("/despachos/{id}")
    public ResponseEntity<DespachoConstruccionEntity> obtenerDespacho(@PathVariable Long id) {
        return construccionService.obtenerDespacho(requireTenant(), id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    public ResponseEntity<DespachoConstruccionEntity> crearDespacho(Long proyectoId, DespachoConstruccionEntity despacho) {
        return crearDespacho(proyectoId, despacho, null);
    }

    @PostMapping("/proyectos/{proyectoId}/despachos")
    public ResponseEntity<DespachoConstruccionEntity> crearDespacho(
            @PathVariable Long proyectoId,
            @RequestBody DespachoConstruccionEntity despacho,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        return ResponseEntity.ok(construccionService.registrarDespacho(requireTenant(), proyectoId, despacho, idempotencyKey));
    }

    @PatchMapping("/despachos/{id}/estado")
    public ResponseEntity<DespachoConstruccionEntity> cambiarEstadoDespacho(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String nuevoEstado = body != null ? body.get("estado") : null;
        String observaciones = body != null ? body.get("observaciones") : null;
        return ResponseEntity.ok(construccionService.actualizarEstadoDespacho(requireTenant(), id, nuevoEstado, observaciones));
    }
}
