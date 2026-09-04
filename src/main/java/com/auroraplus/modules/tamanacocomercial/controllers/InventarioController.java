package com.auroraplus.modules.tamanacocomercial.controllers;

import com.auroraplus.modules.tamanacocomercial.entities.MovimientoStock;
import com.auroraplus.modules.tamanacocomercial.entities.ProductoComercial;
import com.auroraplus.modules.tamanacocomercial.repositories.MovimientoStockRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.ProductoComercialRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tamanaco-comercial/inventario")
public class InventarioController {

    @Autowired
    private ProductoComercialRepository productoRepository;

    @Autowired
    private MovimientoStockRepository movimientoStockRepository;

    @GetMapping("/productos")
    public ResponseEntity<List<ProductoComercial>> listarProductos() {
        return ResponseEntity.ok(productoRepository.findAllByOrderByNombreAsc());
    }

    @PostMapping("/productos")
    public ResponseEntity<?> crearProducto(@RequestParam Long tenantId, @RequestBody ProductoComercial producto) {
        if (producto.getNombre() == null || producto.getNombre().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre del producto es obligatorio"));
        }
        producto.setTenantId(tenantId);
        return ResponseEntity.status(HttpStatus.CREATED).body(productoRepository.save(producto));
    }

    @PutMapping("/productos/{id}")
    public ResponseEntity<?> actualizarProducto(@PathVariable Long id, @RequestBody ProductoComercial update) {
        return productoRepository.findById(id).map(p -> {
            if (update.getCodigo() != null) p.setCodigo(update.getCodigo());
            if (update.getNombre() != null) p.setNombre(update.getNombre());
            if (update.getDescripcion() != null) p.setDescripcion(update.getDescripcion());
            if (update.getCategoria() != null) p.setCategoria(update.getCategoria());
            if (update.getUnidadMedida() != null) p.setUnidadMedida(update.getUnidadMedida());
            if (update.getStockMinimo() != null) p.setStockMinimo(update.getStockMinimo());
            p.setUpdatedAt(LocalDateTime.now());
            return ResponseEntity.ok(productoRepository.save(p));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/productos/{id}")
    public ResponseEntity<?> eliminarProducto(@PathVariable Long id) {
        if (!productoRepository.existsById(id)) return ResponseEntity.notFound().build();
        productoRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/movimientos")
    public ResponseEntity<List<MovimientoStock>> listarMovimientos(@RequestParam(required = false) Long productoId) {
        if (productoId != null) {
            return ResponseEntity.ok(movimientoStockRepository.findByProductoIdOrderByFechaDescIdDesc(productoId));
        }
        return ResponseEntity.ok(movimientoStockRepository.findAllByOrderByFechaDescIdDesc());
    }

    @PostMapping("/movimientos")
    public ResponseEntity<?> registrarMovimiento(@RequestParam Long tenantId, @RequestBody MovimientoStock movimiento) {
        if (movimiento.getProducto() == null || movimiento.getProducto().getId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Producto es obligatorio"));
        }
        if (movimiento.getCantidad() == null || movimiento.getCantidad().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "La cantidad debe ser mayor a cero"));
        }
        if (movimiento.getTipo() == null || (!movimiento.getTipo().equals("ENTRADA") && !movimiento.getTipo().equals("SALIDA") && !movimiento.getTipo().equals("AJUSTE"))) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tipo de movimiento inválido"));
        }

        ProductoComercial p = productoRepository.findById(movimiento.getProducto().getId()).orElse(null);
        if (p == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "El producto no existe"));
        }

        BigDecimal stockAnterior = p.getStockActual() != null ? p.getStockActual() : BigDecimal.ZERO;
        BigDecimal nuevoStock;

        if (movimiento.getTipo().equals("ENTRADA")) {
            nuevoStock = stockAnterior.add(movimiento.getCantidad());
        } else if (movimiento.getTipo().equals("SALIDA")) {
            nuevoStock = stockAnterior.subtract(movimiento.getCantidad());
        } else {
            nuevoStock = movimiento.getCantidad();
        }

        movimiento.setTenantId(tenantId);
        movimiento.setProducto(p);
        movimiento.setStockAnterior(stockAnterior);
        movimiento.setStockNuevo(nuevoStock);
        if (movimiento.getFecha() == null) movimiento.setFecha(LocalDateTime.now());

        MovimientoStock guardado = movimientoStockRepository.save(movimiento);

        p.setStockActual(nuevoStock);
        productoRepository.save(p);

        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }
}
