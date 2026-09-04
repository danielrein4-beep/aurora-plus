package com.auroraplus.modules.moda.controllers;

import com.auroraplus.modules.moda.entities.ProductoModa;
import com.auroraplus.modules.moda.entities.VarianteModa;
import com.auroraplus.modules.moda.repositories.ProductoModaRepository;
import com.auroraplus.modules.moda.repositories.VarianteModaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/moda/productos")
public class ProductoModaController {

    @Autowired
    private ProductoModaRepository productoModaRepository;

    @Autowired
    private VarianteModaRepository varianteModaRepository;

    @GetMapping
    public List<ProductoModa> listar() {
        return productoModaRepository.findAllByOrderByNombreAsc();
    }

    @GetMapping("/{id}")
    public ProductoModa obtener(@PathVariable Long id) {
        return productoModaRepository.findById(id).orElseThrow(() -> new RuntimeException("Producto no encontrado"));
    }

    @PostMapping
    public ResponseEntity<ProductoModa> crear(@RequestParam Long tenantId, @RequestBody ProductoModa producto) {
        producto.setTenantId(tenantId);
        return ResponseEntity.ok(productoModaRepository.save(producto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductoModa> actualizar(@PathVariable Long id, @RequestBody ProductoModa datos) {
        ProductoModa producto = productoModaRepository.findById(id).orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        producto.setNombre(datos.getNombre());
        producto.setCategoria(datos.getCategoria());
        producto.setMarca(datos.getMarca());
        producto.setPrecioVenta(datos.getPrecioVenta());
        return ResponseEntity.ok(productoModaRepository.save(producto));
    }

    // ── Matriz dimensional (Subfase 6.1): crea una variante Talla+Color para un producto padre ──
    public static class VarianteRequest {
        public String talla;
        public String color;
        public String codigoBarras;
        public BigDecimal stockInicial;
    }

    @PostMapping("/{productoId}/variantes")
    public ResponseEntity<VarianteModa> crearVariante(@PathVariable Long productoId, @RequestParam Long tenantId,
                                                        @RequestBody VarianteRequest request) {
        ProductoModa producto = productoModaRepository.findById(productoId)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        if (!producto.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Producto no pertenece a este tenant");
        }
        if (request.codigoBarras == null || request.codigoBarras.isBlank()) {
            throw new RuntimeException("El código de barras es obligatorio");
        }

        VarianteModa variante = new VarianteModa();
        variante.setTenantId(tenantId);
        variante.setProducto(producto);
        variante.setTalla(request.talla);
        variante.setColor(request.color);
        variante.setCodigoBarras(request.codigoBarras);
        variante.setStockActual(request.stockInicial != null ? request.stockInicial : BigDecimal.ZERO);

        return ResponseEntity.ok(varianteModaRepository.save(variante));
    }

    @GetMapping("/{productoId}/variantes")
    public List<VarianteModa> listarVariantes(@PathVariable Long productoId) {
        return varianteModaRepository.findByProductoId(productoId);
    }

    @GetMapping("/variantes/codigo-barras/{codigoBarras}")
    public VarianteModa buscarPorCodigoBarras(@PathVariable String codigoBarras) {
        return varianteModaRepository.findByCodigoBarras(codigoBarras)
            .orElseThrow(() -> new RuntimeException("Variante no encontrada para el código de barras: " + codigoBarras));
    }
}
