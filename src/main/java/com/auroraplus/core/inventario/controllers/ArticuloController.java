package com.auroraplus.core.inventario.controllers;

import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.core.inventario.entities.Kardex;
import com.auroraplus.core.inventario.repositories.ArticuloRepository;
import com.auroraplus.core.inventario.repositories.KardexRepository;
import com.auroraplus.core.inventario.services.InventarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/** CRUD de artículos de inventario base (Fase 1.4) — no existía ningún controller para esto todavía. */
@RestController
@RequestMapping("/api/inventario/articulos")
public class ArticuloController {

    @Autowired
    private ArticuloRepository articuloRepository;

    @Autowired
    private KardexRepository kardexRepository;

    @Autowired
    private InventarioService inventarioService;

    @GetMapping
    public List<Articulo> listar() {
        return articuloRepository.findAll();
    }

    @GetMapping("/{id}")
    public Articulo obtener(@PathVariable Long id) {
        return articuloRepository.findById(id).orElseThrow(() -> new RuntimeException("Artículo no encontrado"));
    }

    @GetMapping("/sku/{sku}")
    public Articulo buscarPorSku(@PathVariable String sku, @RequestParam Long tenantId) {
        return articuloRepository.findBySkuAndTenantId(sku, tenantId)
            .orElseThrow(() -> new RuntimeException("Artículo no encontrado para el SKU: " + sku));
    }

    @PostMapping
    public ResponseEntity<Articulo> crear(@RequestParam Long tenantId, @RequestBody Articulo articulo) {
        articulo.setTenantId(tenantId);
        return ResponseEntity.ok(articuloRepository.save(articulo));
    }

    @PutMapping("/{id}/stock-minimo")
    public ResponseEntity<Articulo> actualizarStockMinimo(@PathVariable Long id, @RequestParam BigDecimal stockMinimo) {
        Articulo articulo = articuloRepository.findById(id).orElseThrow(() -> new RuntimeException("Artículo no encontrado"));
        articulo.setStockMinimo(stockMinimo);
        return ResponseEntity.ok(articuloRepository.save(articulo));
    }

    /** Insumos por debajo de su umbral de reposición — para alertar antes de que se agote un ingrediente crítico. */
    @GetMapping("/alertas-stock-minimo")
    public List<Articulo> alertasStockMinimo(@RequestParam Long tenantId) {
        return articuloRepository.findConStockBajoMinimo(tenantId);
    }

    public static class EntradaRequest {
        public BigDecimal cantidad;
        public BigDecimal costoUnitario;
        public String motivo;
    }

    /** Entrada de stock (compra/reposición) — actualiza también el costo unitario vigente del artículo. */
    @PostMapping("/{id}/entrada")
    public ResponseEntity<Kardex> registrarEntrada(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody EntradaRequest request) {
        Articulo articulo = articuloRepository.findById(id).orElseThrow(() -> new RuntimeException("Artículo no encontrado"));
        if (!articulo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Artículo no pertenece a este tenant");
        }
        if (request.costoUnitario != null) {
            articulo.setCostoUnitario(request.costoUnitario);
            articuloRepository.save(articulo);
        }
        return ResponseEntity.ok(inventarioService.registrarMovimientoKardex(id, tenantId, Kardex.TipoOperacion.ENTRADA,
            request.cantidad, request.costoUnitario != null ? request.costoUnitario : articulo.getCostoUnitario(),
            request.motivo != null ? request.motivo : "Entrada de stock"));
    }

    @GetMapping("/{id}/kardex")
    public List<Kardex> kardex(@PathVariable Long id) {
        return kardexRepository.findByArticuloIdOrderByIdDesc(id);
    }
}
