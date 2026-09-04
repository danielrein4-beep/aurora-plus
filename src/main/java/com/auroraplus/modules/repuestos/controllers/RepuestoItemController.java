package com.auroraplus.modules.repuestos.controllers;

import com.auroraplus.modules.repuestos.entities.MovimientoRepuesto;
import com.auroraplus.modules.repuestos.entities.RepuestoItem;
import com.auroraplus.modules.repuestos.repositories.MovimientoRepuestoRepository;
import com.auroraplus.modules.repuestos.repositories.RepuestoItemRepository;
import com.auroraplus.modules.repuestos.services.RepuestoConversionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * CRUD y búsqueda del catálogo masivo de repuestos (Subfase 5.1) y venta
 * directa con precio automático Mayorista/Detal por volumen (Subfase 5.3).
 */
@RestController
@RequestMapping("/api/repuestos/items")
public class RepuestoItemController {

    @Autowired
    private RepuestoItemRepository repuestoItemRepository;

    @Autowired
    private RepuestoConversionService repuestoConversionService;

    @Autowired
    private MovimientoRepuestoRepository movimientoRepuestoRepository;

    @GetMapping
    public List<RepuestoItem> listar() {
        return repuestoItemRepository.findAll();
    }

    @GetMapping("/sku/{codigoSku}")
    public ResponseEntity<RepuestoItem> buscarPorSku(@PathVariable String codigoSku, @RequestParam Long tenantId) {
        return repuestoItemRepository.findByCodigoSkuAndTenantId(codigoSku, tenantId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/oem/{codigoOem}")
    public List<RepuestoItem> buscarPorOem(@PathVariable String codigoOem, @RequestParam Long tenantId) {
        return repuestoItemRepository.findByCodigoOriginalOemAndTenantId(codigoOem, tenantId);
    }

    @PostMapping
    public ResponseEntity<RepuestoItem> crear(@RequestParam Long tenantId, @RequestBody RepuestoItem item) {
        if (item.getCodigoSku() == null || item.getCodigoSku().isBlank()) {
            throw new RuntimeException("El código SKU es obligatorio");
        }
        item.setTenantId(tenantId);
        return ResponseEntity.status(HttpStatus.CREATED).body(repuestoItemRepository.save(item));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RepuestoItem> actualizar(@PathVariable Long id, @RequestBody RepuestoItem datos) {
        return repuestoItemRepository.findById(id)
            .map(item -> {
                if (datos.getDescripcion() != null) item.setDescripcion(datos.getDescripcion());
                if (datos.getCodigoOriginalOem() != null) item.setCodigoOriginalOem(datos.getCodigoOriginalOem());
                if (datos.getPrecioVenta() != null) item.setPrecioVenta(datos.getPrecioVenta());
                if (datos.getPrecioMayorista() != null) item.setPrecioMayorista(datos.getPrecioMayorista());
                if (datos.getCantidadMinimaMayorista() != null) item.setCantidadMinimaMayorista(datos.getCantidadMinimaMayorista());
                if (datos.getUnidadBase() != null) item.setUnidadBase(datos.getUnidadBase());
                return ResponseEntity.ok(repuestoItemRepository.save(item));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        if (!repuestoItemRepository.existsById(id)) return ResponseEntity.notFound().build();
        repuestoItemRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    /** Kárdex: historial completo de compras/ventas/ajustes de un ítem, para auditar cualquier descuadre. */
    @GetMapping("/{id}/movimientos")
    public List<MovimientoRepuesto> historialMovimientos(@PathVariable Long id) {
        return movimientoRepuestoRepository.findByRepuestoIdOrderByFechaRegistroDesc(id);
    }

    /** Subfase 5.3: venta directa con precio automático Mayorista/Detal según cantidad. */
    @PostMapping("/{id}/vender")
    public ResponseEntity<Map<String, Object>> venderPorVolumen(@PathVariable Long id, @RequestParam Long tenantId,
                                                                  @RequestParam BigDecimal cantidad,
                                                                  @RequestParam(required = false) String monedaPago,
                                                                  @RequestParam(required = false) BigDecimal montoRecibido,
                                                                  @RequestParam(required = false) String claveIdempotencia) {
        RepuestoConversionService.ResultadoVenta resultado = repuestoConversionService.venderPorVolumen(id, tenantId, cantidad, monedaPago, montoRecibido, claveIdempotencia);
        return ResponseEntity.ok(Map.of(
            "precioUnitarioAplicado", resultado.getPrecioUnitarioAplicado(),
            "total", resultado.getTotal(),
            "esMayorista", resultado.isEsMayorista()
        ));
    }
}
