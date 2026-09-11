package com.auroraplus.modules.retail.controllers;

import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.modules.retail.entities.ItemVentaRetail;
import com.auroraplus.modules.retail.entities.VentaRetail;
import com.auroraplus.modules.retail.repositories.ItemVentaRetailRepository;
import com.auroraplus.modules.retail.repositories.VentaRetailRepository;
import com.auroraplus.modules.retail.services.RetailVentaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/retail")
public class RetailVentaController {

    @Autowired
    private RetailVentaService retailVentaService;

    @Autowired
    private VentaRetailRepository ventaRetailRepository;

    @Autowired
    private ItemVentaRetailRepository itemVentaRetailRepository;

    /** Búsqueda unificada del POS: código de barras, nombre/SKU, principio activo o código OEM. */
    @GetMapping("/articulos/buscar")
    public List<Articulo> buscarArticulos(@RequestParam Long tenantId, @RequestParam String texto) {
        return retailVentaService.buscarArticulos(tenantId, texto);
    }

    @PostMapping("/ventas")
    public ResponseEntity<Map<String, Object>> registrarVenta(@RequestParam Long tenantId, @RequestBody RetailVentaService.VentaRequest request) {
        VentaRetail venta = retailVentaService.registrarVenta(tenantId, request);
        List<ItemVentaRetail> items = itemVentaRetailRepository.findByVentaId(venta.getId());
        return ResponseEntity.ok(Map.of("venta", venta, "items", items));
    }

    @GetMapping("/ventas")
    public List<VentaRetail> listarVentas(@RequestParam Long tenantId) {
        return ventaRetailRepository.findByTenantIdOrderByFechaRegistroDesc(tenantId);
    }

    // tenantId es obligatorio aquí (no solo el filtro de Hibernate) para que
    // TenantInterceptor pueda comparalo contra el del JWT — antes este
    // endpoint no pedía tenantId y cualquier usuario autenticado podía leer
    // los items de la venta de CUALQUIER tenant con solo cambiar el {id}.
    @GetMapping("/ventas/{id}/items")
    public List<ItemVentaRetail> itemsDeVenta(@RequestParam Long tenantId, @PathVariable Long id) {
        return itemVentaRetailRepository.findByVentaId(id);
    }
}
