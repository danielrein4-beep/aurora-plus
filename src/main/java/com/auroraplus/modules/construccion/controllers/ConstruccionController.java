package com.auroraplus.modules.construccion.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.construccion.entities.*;
import com.auroraplus.modules.construccion.services.ConstruccionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/construccion")
public class ConstruccionController {

    @Autowired
    private ConstruccionService construccionService;

    private Long getTenant(Long paramTenant) {
        Long t = paramTenant != null ? paramTenant : TenantContext.getCurrentTenant();
        return t != null ? t : 1L; // Fallback demo tenant 1
    }

    // Proyectos
    @GetMapping("/proyectos")
    public List<ProyectoConstruccionEntity> listarProyectos(@RequestParam(required = false) Long tenantId) {
        return construccionService.listarProyectos(getTenant(tenantId));
    }

    @PostMapping("/proyectos")
    public ResponseEntity<ProyectoConstruccionEntity> crearProyecto(
            @RequestParam(required = false) Long tenantId,
            @RequestBody ProyectoConstruccionEntity proyecto) {
        return ResponseEntity.ok(construccionService.guardarProyecto(getTenant(tenantId), proyecto));
    }

    @GetMapping("/proyectos/{id}")
    public ResponseEntity<ProyectoConstruccionEntity> obtenerProyecto(
            @PathVariable Long id,
            @RequestParam(required = false) Long tenantId) {
        return construccionService.obtenerProyecto(getTenant(tenantId), id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Capítulos
    @GetMapping("/capitulos")
    public List<CapituloConstruccionEntity> listarCapitulos(@RequestParam(required = false) Long tenantId) {
        return construccionService.listarCapitulos(getTenant(tenantId));
    }

    @PostMapping("/capitulos")
    public ResponseEntity<CapituloConstruccionEntity> crearCapitulo(
            @RequestParam(required = false) Long tenantId,
            @RequestBody CapituloConstruccionEntity capitulo) {
        return ResponseEntity.ok(construccionService.guardarCapitulo(getTenant(tenantId), capitulo));
    }

    // Partidas
    @GetMapping("/proyectos/{proyectoId}/partidas")
    public List<PartidaConstruccionEntity> listarPartidas(
            @PathVariable Long proyectoId,
            @RequestParam(required = false) Long tenantId) {
        return construccionService.listarPartidas(getTenant(tenantId), proyectoId);
    }

    @PostMapping("/proyectos/{proyectoId}/partidas")
    public ResponseEntity<PartidaConstruccionEntity> crearPartida(
            @PathVariable Long proyectoId,
            @RequestParam(required = false) Long tenantId,
            @RequestBody PartidaConstruccionEntity partida) {
        partida.setProyectoId(proyectoId);
        return ResponseEntity.ok(construccionService.guardarPartida(getTenant(tenantId), partida));
    }

    @DeleteMapping("/partidas/{id}")
    public ResponseEntity<Void> eliminarPartida(
            @PathVariable Long id,
            @RequestParam(required = false) Long tenantId) {
        construccionService.eliminarPartida(getTenant(tenantId), id);
        return ResponseEntity.noContent().build();
    }

    // Valuaciones
    @GetMapping("/proyectos/{proyectoId}/valuaciones")
    public List<ValuacionConstruccionEntity> listarValuaciones(
            @PathVariable Long proyectoId,
            @RequestParam(required = false) Long tenantId) {
        return construccionService.listarValuaciones(getTenant(tenantId), proyectoId);
    }

    @PostMapping("/proyectos/{proyectoId}/valuaciones")
    public ResponseEntity<ValuacionConstruccionEntity> crearValuacion(
            @PathVariable Long proyectoId,
            @RequestParam(required = false) Long tenantId,
            @RequestBody ValuacionConstruccionEntity valuacion) {
        valuacion.setProyectoId(proyectoId);
        return ResponseEntity.ok(construccionService.guardarValuacion(getTenant(tenantId), valuacion));
    }

    @PatchMapping("/valuaciones/{id}/estado")
    public ResponseEntity<ValuacionConstruccionEntity> cambiarEstadoValuacion(
            @PathVariable Long id,
            @RequestParam(required = false) Long tenantId,
            @RequestBody Map<String, String> body) {
        String estado = body.get("estado");
        return construccionService.actualizarEstadoValuacion(getTenant(tenantId), id, estado)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Insumos
    @GetMapping("/insumos")
    public List<InsumoConstruccionEntity> listarInsumos(@RequestParam(required = false) Long tenantId) {
        return construccionService.listarInsumos(getTenant(tenantId));
    }

    @PostMapping("/insumos")
    public ResponseEntity<InsumoConstruccionEntity> crearInsumo(
            @RequestParam(required = false) Long tenantId,
            @RequestBody InsumoConstruccionEntity insumo) {
        return ResponseEntity.ok(construccionService.guardarInsumo(getTenant(tenantId), insumo));
    }

    @PostMapping("/insumos/{id}/consumo")
    public ResponseEntity<InsumoConstruccionEntity> registrarConsumo(
            @PathVariable Long id,
            @RequestParam(required = false) Long tenantId,
            @RequestBody Map<String, BigDecimal> body) {
        BigDecimal cantidad = body.get("cantidad");
        if (cantidad == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(construccionService.registrarConsumoInsumo(getTenant(tenantId), id, cantidad));
    }

    // Bitácora
    @GetMapping("/proyectos/{proyectoId}/bitacora")
    public List<BitacoraConstruccionEntity> listarBitacora(
            @PathVariable Long proyectoId,
            @RequestParam(required = false) Long tenantId) {
        return construccionService.listarBitacora(getTenant(tenantId), proyectoId);
    }

    @PostMapping("/proyectos/{proyectoId}/bitacora")
    public ResponseEntity<BitacoraConstruccionEntity> agregarBitacora(
            @PathVariable Long proyectoId,
            @RequestParam(required = false) Long tenantId,
            @RequestBody BitacoraConstruccionEntity entrada) {
        entrada.setProyectoId(proyectoId);
        return ResponseEntity.ok(construccionService.agregarEntradaBitacora(getTenant(tenantId), entrada));
    }

    // Catálogo COVENIN
    @GetMapping("/catalogo-covenin")
    public List<CatalogoCoveninEntity> buscarCatalogo(@RequestParam(required = false) String q) {
        return construccionService.buscarCatalogo(q);
    }
}
