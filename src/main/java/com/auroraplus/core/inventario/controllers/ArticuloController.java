package com.auroraplus.core.inventario.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.core.inventario.entities.Kardex;
import com.auroraplus.core.inventario.entities.LoteArticulo;
import com.auroraplus.core.inventario.repositories.ArticuloRepository;
import com.auroraplus.core.inventario.repositories.KardexRepository;
import com.auroraplus.core.inventario.repositories.LoteArticuloRepository;
import com.auroraplus.core.inventario.services.InventarioService;
import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

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

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private LoteArticuloRepository loteArticuloRepository;

    @GetMapping
    public List<Articulo> listar() {
        // El filtro de Hibernate habilitado en TenantInterceptor no llega vivo
        // hasta acá (ver hallazgo de seguridad — el enableFilter del
        // interceptor no persiste a la sesión que ejecuta esta query), así
        // que se re-habilita explícitamente aquí antes de consultar. Sin esto,
        // findAll() devuelve artículos de TODOS los tenants sin distinción.
        entityManager.unwrap(Session.class).enableFilter("tenantFilter")
            .setParameter("tenantId", TenantContext.getCurrentTenant());
        return articuloRepository.findAll();
    }

    @GetMapping("/{id}")
    public Articulo obtener(@PathVariable Long id, @RequestParam Long tenantId) {
        Articulo articulo = articuloRepository.findById(id).orElseThrow(() -> new RuntimeException("Artículo no encontrado"));
        if (!articulo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Artículo no pertenece a este tenant");
        }
        return articulo;
    }

    @GetMapping("/sku/{sku}")
    public Articulo buscarPorSku(@PathVariable String sku, @RequestParam Long tenantId) {
        return articuloRepository.findBySkuAndTenantId(sku, tenantId)
            .orElseThrow(() -> new RuntimeException("Artículo no encontrado para el SKU: " + sku));
    }

    @PostMapping
    public ResponseEntity<Articulo> crear(@RequestParam Long tenantId, @RequestBody Articulo articulo) {
        articulo.setTenantId(tenantId);
        // porcentajeImpuesto y categoria son NOT NULL en la base — sin un valor
        // por defecto acá, cualquier alta que no los mande (ej. el formulario
        // rápido de artículos en Horeca) revienta con 500 en vez de un error claro.
        if (articulo.getPorcentajeImpuesto() == null) {
            articulo.setPorcentajeImpuesto(BigDecimal.ZERO);
        }
        if (articulo.getCategoria() == null || articulo.getCategoria().isBlank()) {
            articulo.setCategoria("General");
        }
        return ResponseEntity.ok(articuloRepository.save(articulo));
    }

    @PutMapping("/{id}/stock-minimo")
    public ResponseEntity<Articulo> actualizarStockMinimo(@PathVariable Long id, @RequestParam BigDecimal stockMinimo) {
        Articulo articulo = articuloRepository.findById(id).orElseThrow(() -> new RuntimeException("Artículo no encontrado"));
        articulo.setStockMinimo(stockMinimo);
        return ResponseEntity.ok(articuloRepository.save(articulo));
    }

    public static class EditarArticuloRequest {
        public String nombre;
        public String categoria;
        public String unidadMedida;
        public BigDecimal costoUnitario;
        public BigDecimal precioVenta;
        public BigDecimal stockMinimo;
        public String sku;
    }

    /** Corrige datos del artículo (nombre, categoría, unidad, costo, precio de venta, stock mínimo) — NO toca stockActual, que solo cambia vía Kardex (entrada/salida/ajuste) para no perder el rastro de auditoría. */
    @PutMapping("/{id}")
    public ResponseEntity<Articulo> editar(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody EditarArticuloRequest request) {
        Articulo articulo = articuloRepository.findById(id).orElseThrow(() -> new RuntimeException("Artículo no encontrado"));
        if (!articulo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Artículo no pertenece a este tenant");
        }
        if (request.nombre != null && !request.nombre.isBlank()) articulo.setNombre(request.nombre.trim());
        if (request.categoria != null) articulo.setCategoria(request.categoria.isBlank() ? "General" : request.categoria.trim());
        if (request.unidadMedida != null && !request.unidadMedida.isBlank()) articulo.setUnidadMedida(request.unidadMedida.trim());
        if (request.costoUnitario != null) articulo.setCostoUnitario(request.costoUnitario);
        if (request.precioVenta != null) articulo.setPrecioVenta(request.precioVenta);
        if (request.stockMinimo != null) articulo.setStockMinimo(request.stockMinimo);
        if (request.sku != null && !request.sku.isBlank()) articulo.setSku(request.sku.trim());
        return ResponseEntity.ok(articuloRepository.save(articulo));
    }

    public static class AjustarStockRequest {
        public BigDecimal stockReal; // cantidad real contada físicamente — el sistema calcula la diferencia sola
        public String motivo;
    }

    /**
     * Corrección de inventario: en vez de que el usuario calcule a mano cuánto
     * hay que sumar o restar, indica cuánto tiene REALMENTE contado y el
     * sistema registra la diferencia como entrada o merma en el Kardex — así
     * queda auditado por qué cambió el stock, no solo el número nuevo.
     */
    @PostMapping("/{id}/ajustar-stock")
    public ResponseEntity<Articulo> ajustarStock(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody AjustarStockRequest request) {
        Articulo articulo = articuloRepository.findById(id).orElseThrow(() -> new RuntimeException("Artículo no encontrado"));
        if (!articulo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Artículo no pertenece a este tenant");
        }
        if (request.stockReal == null || request.stockReal.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Indique el stock real contado (no puede ser negativo)");
        }

        BigDecimal diferencia = request.stockReal.subtract(articulo.getStockActual());
        String motivo = request.motivo != null && !request.motivo.isBlank() ? request.motivo : "Corrección de inventario (conteo físico)";
        if (diferencia.compareTo(BigDecimal.ZERO) > 0) {
            inventarioService.registrarMovimientoKardex(id, tenantId, Kardex.TipoOperacion.ENTRADA, diferencia, articulo.getCostoUnitario(), motivo);
        } else if (diferencia.compareTo(BigDecimal.ZERO) < 0) {
            inventarioService.registrarMovimientoKardex(id, tenantId, Kardex.TipoOperacion.MERMA, diferencia.abs(), articulo.getCostoUnitario(), motivo);
        }

        return ResponseEntity.ok(articuloRepository.findById(id).orElseThrow());
    }

    /** Elimina un artículo (ej. duplicado creado por error). Si ya tiene movimientos, compras o se usa en una receta, la base lo rechaza — se traduce a un error claro. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id, @RequestParam Long tenantId) {
        Articulo articulo = articuloRepository.findById(id).orElseThrow(() -> new RuntimeException("Artículo no encontrado"));
        if (!articulo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Artículo no pertenece a este tenant");
        }
        try {
            articuloRepository.delete(articulo);
            articuloRepository.flush();
        } catch (DataIntegrityViolationException e) {
            throw new RuntimeException("No se puede eliminar \"" + articulo.getNombre()
                + "\": ya tiene movimientos de inventario, compras o se usa en una receta.");
        }
        return ResponseEntity.noContent().build();
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
        // Opcional: si el artículo es perecedero, crea de una vez un LoteArticulo
        // rastreable para las alertas de vencimiento — mismo comportamiento que
        // una compra con factura, pero sin necesitar un proveedor para el alta
        // rápida de un artículo nuevo desde Inventario.
        public LocalDate fechaVencimiento;
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
        BigDecimal costoAplicado = request.costoUnitario != null ? request.costoUnitario : articulo.getCostoUnitario();
        Kardex movimiento = inventarioService.registrarMovimientoKardex(id, tenantId, Kardex.TipoOperacion.ENTRADA,
            request.cantidad, costoAplicado, request.motivo != null ? request.motivo : "Entrada de stock");

        if (request.fechaVencimiento != null) {
            LoteArticulo lote = new LoteArticulo();
            lote.setTenantId(tenantId);
            lote.setArticulo(articulo);
            lote.setCantidadIngresada(request.cantidad);
            lote.setCantidadActual(request.cantidad);
            lote.setCostoUnitario(costoAplicado);
            lote.setFechaVencimiento(request.fechaVencimiento);
            lote.setReferenciaCompra(request.motivo != null ? request.motivo : "Entrada de stock");
            loteArticuloRepository.save(lote);
        }

        return ResponseEntity.ok(movimiento);
    }

    @GetMapping("/{id}/kardex")
    public List<Kardex> kardex(@PathVariable Long id, @RequestParam Long tenantId) {
        Articulo articulo = articuloRepository.findById(id).orElseThrow(() -> new RuntimeException("Artículo no encontrado"));
        if (!articulo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Artículo no pertenece a este tenant");
        }
        return kardexRepository.findByArticuloIdOrderByIdDesc(id);
    }

    public static class ItemImportacion {
        public String sku;
        public String nombre;
        public String unidadMedida;
        public String categoria;
        public BigDecimal costoUnitario;
        public BigDecimal stockInicial; // opcional — si viene, registra una entrada de Kardex de una vez
    }

    public static class FilaConError {
        public int fila;
        public String motivo;
        public FilaConError(int fila, String motivo) { this.fila = fila; this.motivo = motivo; }
    }

    public static class ResultadoImportacion {
        public int creados = 0;
        public int actualizados = 0;
        public List<FilaConError> errores = new ArrayList<>();
    }

    /**
     * Carga masiva de artículos (esquema preparado para la próxima
     * importación desde Excel/CSV — el frontend parsea el archivo con
     * SheetJS y manda esta misma lista de filas ya como JSON, no el archivo
     * crudo). Por SKU: si ya existe para este tenant, ACTUALIZA nombre/
     * categoría/unidad/costo; si no existe, lo CREA. Una fila con error no
     * aborta el resto del lote — se acumula en `errores` con el número de
     * fila para que el usuario pueda corregir solo esas líneas.
     */
    @PostMapping("/importar-lote")
    @Transactional
    public ResponseEntity<ResultadoImportacion> importarLote(@RequestParam Long tenantId, @RequestBody List<ItemImportacion> items) {
        ResultadoImportacion resultado = new ResultadoImportacion();
        for (int i = 0; i < items.size(); i++) {
            ItemImportacion item = items.get(i);
            try {
                if (item.sku == null || item.sku.isBlank()) throw new RuntimeException("Falta el SKU");
                if (item.nombre == null || item.nombre.isBlank()) throw new RuntimeException("Falta el nombre");

                Optional<Articulo> existente = articuloRepository.findBySkuAndTenantId(item.sku.trim(), tenantId);
                Articulo articulo = existente.orElseGet(Articulo::new);
                boolean esNuevo = articulo.getId() == null;

                articulo.setTenantId(tenantId);
                articulo.setSku(item.sku.trim());
                articulo.setNombre(item.nombre.trim());
                articulo.setUnidadMedida(item.unidadMedida != null && !item.unidadMedida.isBlank() ? item.unidadMedida.trim() : "unidad");
                articulo.setCategoria(item.categoria != null && !item.categoria.isBlank() ? item.categoria.trim() : "General");
                if (item.costoUnitario != null) articulo.setCostoUnitario(item.costoUnitario);
                if (esNuevo) articulo.setPorcentajeImpuesto(BigDecimal.ZERO);

                articulo = articuloRepository.save(articulo);

                if (item.stockInicial != null && item.stockInicial.compareTo(BigDecimal.ZERO) > 0) {
                    inventarioService.registrarMovimientoKardex(articulo.getId(), tenantId, Kardex.TipoOperacion.ENTRADA,
                        item.stockInicial, articulo.getCostoUnitario(), "Carga masiva de inventario");
                }

                if (esNuevo) resultado.creados++; else resultado.actualizados++;
            } catch (Exception e) {
                resultado.errores.add(new FilaConError(i + 1, e.getMessage()));
            }
        }
        return ResponseEntity.ok(resultado);
    }
}
