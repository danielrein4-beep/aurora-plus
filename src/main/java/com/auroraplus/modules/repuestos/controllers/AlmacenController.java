package com.auroraplus.modules.repuestos.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.repuestos.entities.Almacen;
import com.auroraplus.modules.repuestos.entities.StockAlmacen;
import com.auroraplus.modules.repuestos.services.AlmacenService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/repuestos/almacenes")
public class AlmacenController {

    @Autowired
    private AlmacenService almacenService;

    @GetMapping
    public List<Almacen> listar() {
        Long tenantId = TenantContext.getCurrentTenant();
        return almacenService.listar(tenantId);
    }

    public static class CrearAlmacenRequest {
        public String nombre;
        public String direccion;
    }

    @PostMapping
    public ResponseEntity<Almacen> crear(@RequestBody CrearAlmacenRequest req) {
        Long tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.status(HttpStatus.CREATED).body(almacenService.crear(tenantId, req.nombre, req.direccion));
    }

    public static class ActualizarAlmacenRequest {
        public String nombre;
        public String direccion;
        public Boolean activo;
    }

    @PutMapping("/{id}")
    public ResponseEntity<Almacen> actualizar(@PathVariable Long id, @RequestBody ActualizarAlmacenRequest req) {
        Long tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.ok(almacenService.actualizar(tenantId, id, req.nombre, req.direccion, req.activo));
    }

    @GetMapping("/distribucion/{repuestoId}")
    public ResponseEntity<Map<String, Object>> distribucion(@PathVariable Long repuestoId) {
        Long tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.ok(Map.of(
            "distribucion", almacenService.distribucion(tenantId, repuestoId),
            "sinAsignar", almacenService.sinAsignar(tenantId, repuestoId)
        ));
    }

    public static class TrasladarRequest {
        public Long repuestoId;
        public Long origenId;
        public Long destinoId;
        public BigDecimal cantidad;
    }

    @PostMapping("/trasladar")
    public ResponseEntity<Void> trasladar(@RequestBody TrasladarRequest req) {
        Long tenantId = TenantContext.getCurrentTenant();
        almacenService.trasladar(tenantId, req.repuestoId, req.origenId, req.destinoId, req.cantidad);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/ubicaciones")
    public List<StockAlmacen> ubicaciones() {
        Long tenantId = TenantContext.getCurrentTenant();
        return almacenService.ubicacionesDelTenant(tenantId);
    }

    public static class UbicacionRequest {
        public Long repuestoId;
        public Long almacenId;
        public String ubicacion;
    }

    @PutMapping("/ubicacion")
    public ResponseEntity<StockAlmacen> fijarUbicacion(@RequestBody UbicacionRequest req) {
        Long tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.ok(almacenService.fijarUbicacion(tenantId, req.almacenId, req.repuestoId, req.ubicacion));
    }
}
