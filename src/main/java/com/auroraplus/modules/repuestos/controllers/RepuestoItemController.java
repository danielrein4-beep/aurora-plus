package com.auroraplus.modules.repuestos.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.repuestos.entities.MovimientoRepuesto;
import com.auroraplus.modules.repuestos.entities.RepuestoItem;
import com.auroraplus.modules.repuestos.repositories.MovimientoRepuestoRepository;
import com.auroraplus.modules.repuestos.repositories.RepuestoItemRepository;
import com.auroraplus.modules.repuestos.services.RepuestoConversionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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

    @Autowired
    private RegistroAuditoriaService auditoriaService;

    @GetMapping
    public List<RepuestoItem> listar() {
        return repuestoItemRepository.findByTenantId(TenantContext.getCurrentTenant());
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
        AuthContext.exigirRol("DUENO_ADMIN", "ENCARGADO_INVENTARIO");
        if (item.getCodigoSku() == null || item.getCodigoSku().isBlank()) {
            throw new RuntimeException("El código SKU es obligatorio");
        }
        item.setTenantId(tenantId);
        if (item.getVisible() == null) item.setVisible(true);
        if (item.getOrdenVisualizacion() == null) item.setOrdenVisualizacion(0);
        RepuestoItem guardado = repuestoItemRepository.save(item);
        auditoriaService.registrar(tenantId, "COMERCIO", "CREAR", "RepuestoItem", guardado.getId(), "Creó el repuesto SKU " + guardado.getCodigoSku());
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RepuestoItem> actualizar(@PathVariable Long id, @RequestBody RepuestoItem datos) {
        AuthContext.exigirRol("DUENO_ADMIN", "ENCARGADO_INVENTARIO");
        Long tenantId = TenantContext.getCurrentTenant();
        return repuestoItemRepository.findById(id)
            .filter(item -> tenantId != null && tenantId.equals(item.getTenantId()))
            .map(item -> {
                if (datos.getDescripcion() != null) item.setDescripcion(datos.getDescripcion());
                if (datos.getCodigoOriginalOem() != null) item.setCodigoOriginalOem(datos.getCodigoOriginalOem());
                if (datos.getPrecioVenta() != null) item.setPrecioVenta(datos.getPrecioVenta());
                if (datos.getPrecioMayorista() != null) item.setPrecioMayorista(datos.getPrecioMayorista());
                if (datos.getCantidadMinimaMayorista() != null) item.setCantidadMinimaMayorista(datos.getCantidadMinimaMayorista());
                if (datos.getUnidadBase() != null) item.setUnidadBase(datos.getUnidadBase());
                if (datos.getStockMinimo() != null) item.setStockMinimo(datos.getStockMinimo());
                if (datos.getProveedorPrincipalId() != null) item.setProveedorPrincipalId(datos.getProveedorPrincipalId());
                if (datos.getCategoria() != null) item.setCategoria(datos.getCategoria());
                if (datos.getVisible() != null) item.setVisible(datos.getVisible());
                if (datos.getOrdenVisualizacion() != null) item.setOrdenVisualizacion(datos.getOrdenVisualizacion());
                if (datos.getDescripcionLarga() != null) item.setDescripcionLarga(datos.getDescripcionLarga());
                if (datos.getImagenBase64() != null) item.setImagenBase64(datos.getImagenBase64());
                if (datos.getGrupoVariante() != null) item.setGrupoVariante(datos.getGrupoVariante());
                if (datos.getAtributoVariante() != null) item.setAtributoVariante(datos.getAtributoVariante());
                if (datos.getColorVariante() != null) item.setColorVariante(datos.getColorVariante());
                if (datos.getFechaVencimiento() != null) item.setFechaVencimiento(datos.getFechaVencimiento());
                return ResponseEntity.ok(repuestoItemRepository.save(item));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id, @RequestParam Long tenantId) {
        AuthContext.exigirRol("DUENO_ADMIN", "ENCARGADO_INVENTARIO");
        RepuestoItem item = repuestoItemRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Repuesto no encontrado"));
        if (!item.getTenantId().equals(tenantId)) {
            throw new RuntimeException("No autorizado para eliminar este repuesto");
        }
        repuestoItemRepository.deleteById(id);
        auditoriaService.registrar(tenantId, "COMERCIO", "ELIMINAR", "RepuestoItem", id, "Eliminó el repuesto SKU " + item.getCodigoSku());
        return ResponseEntity.ok().build();
    }

    /** Kárdex: historial completo de compras/ventas/ajustes de un ítem, para auditar cualquier descuadre. */
    @GetMapping("/{id}/movimientos")
    public List<MovimientoRepuesto> historialMovimientos(@PathVariable Long id, @RequestParam Long tenantId) {
        RepuestoItem item = repuestoItemRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Repuesto no encontrado"));
        if (!item.getTenantId().equals(tenantId)) {
            throw new RuntimeException("No autorizado para consultar este repuesto");
        }
        return movimientoRepuestoRepository.findByRepuestoIdOrderByFechaRegistroDesc(id);
    }

    /**
     * Subfase 5.3: venta directa con precio automático Mayorista/Detal según cantidad.
     * `montoPagadoAhora`/`diasCredito`: venta a crédito — si el cliente no paga el total ahora,
     * la diferencia queda como cuenta por cobrar (CXC) real en el motor financiero, ver
     * RepuestoConversionService.registrarCobroVenta.
     */
    @PostMapping("/{id}/vender")
    public ResponseEntity<Map<String, Object>> venderPorVolumen(@PathVariable Long id, @RequestParam Long tenantId,
                                                                  @RequestParam BigDecimal cantidad,
                                                                  @RequestParam(required = false) String monedaPago,
                                                                  @RequestParam(required = false) BigDecimal montoRecibido,
                                                                  @RequestParam(required = false) String claveIdempotencia,
                                                                  @RequestParam(required = false) Long clienteId,
                                                                  @RequestParam(required = false) BigDecimal montoPagadoAhora,
                                                                  @RequestParam(required = false) Integer diasCredito,
                                                                  @RequestParam(required = false) String nombreClienteManual) {
        RepuestoConversionService.ResultadoVenta resultado = repuestoConversionService.venderPorVolumen(
            id, tenantId, cantidad, monedaPago, montoRecibido, claveIdempotencia, clienteId, montoPagadoAhora, diasCredito, nombreClienteManual);
        return ResponseEntity.ok(Map.of(
            "precioUnitarioAplicado", resultado.getPrecioUnitarioAplicado(),
            "total", resultado.getTotal(),
            "esMayorista", resultado.isEsMayorista()
        ));
    }

    public static class AjusteStockRequest {
        public BigDecimal stockReal;
        public String motivo;
    }

    /** Corrección de inventario tras un conteo físico — ver RepuestoConversionService.ajustarStock. */
    @PostMapping("/{id}/ajustar-stock")
    public ResponseEntity<RepuestoItem> ajustarStock(@PathVariable Long id, @RequestParam Long tenantId,
                                                       @RequestBody AjusteStockRequest datos) {
        com.auroraplus.core.auth.AuthContext.exigirRol("DUENO_ADMIN", "ENCARGADO_INVENTARIO", "ADMINISTRADOR_FINCA");
        RepuestoItem actualizado = repuestoConversionService.ajustarStock(id, tenantId, datos.stockReal, datos.motivo);
        return ResponseEntity.ok(actualizado);
    }

    public static class ItemImportacion {
        public String codigoSku;
        public String descripcion;
        public String unidadBase;
        public BigDecimal costoUnitario;
        public BigDecimal precioVenta;
        public BigDecimal stockInicial; // opcional — si viene, registra un movimiento de Kárdex de una vez
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
     * Carga masiva de repuestos desde Excel/CSV (mismo patrón que
     * ArticuloController.importarLote de Horeca — el frontend parsea el
     * archivo con SheetJS y manda esta lista ya como JSON, no el archivo
     * crudo). Por SKU: si ya existe para este tenant, ACTUALIZA descripción/
     * unidad/costo/precio; si no existe, lo CREA. Una fila con error no
     * aborta el resto del lote — se acumula en `errores` con el número de
     * fila para que el usuario pueda corregir solo esas líneas.
     */
    @PostMapping("/importar-lote")
    @Transactional
    public ResponseEntity<ResultadoImportacion> importarLote(@RequestParam Long tenantId, @RequestBody List<ItemImportacion> items) {
        AuthContext.exigirRol("DUENO_ADMIN", "ENCARGADO_INVENTARIO");
        ResultadoImportacion resultado = new ResultadoImportacion();
        for (int i = 0; i < items.size(); i++) {
            ItemImportacion item = items.get(i);
            try {
                if (item.codigoSku == null || item.codigoSku.isBlank()) throw new RuntimeException("Falta el SKU");
                if (item.descripcion == null || item.descripcion.isBlank()) throw new RuntimeException("Falta el nombre/descripción");

                Optional<RepuestoItem> existente = repuestoItemRepository.findByCodigoSkuAndTenantId(item.codigoSku.trim(), tenantId);
                RepuestoItem repuesto = existente.orElseGet(RepuestoItem::new);
                boolean esNuevo = repuesto.getId() == null;
                if (esNuevo) {
                    repuesto.setVisible(true);
                    repuesto.setOrdenVisualizacion(0);
                }

                repuesto.setTenantId(tenantId);
                repuesto.setCodigoSku(item.codigoSku.trim());
                repuesto.setDescripcion(item.descripcion.trim());
                repuesto.setUnidadBase(item.unidadBase != null && !item.unidadBase.isBlank() ? item.unidadBase.trim().toUpperCase() : "UNIDAD");
                if (item.costoUnitario != null) repuesto.setCostoUnitario(item.costoUnitario);
                if (item.precioVenta != null) repuesto.setPrecioVenta(item.precioVenta);
                else if (esNuevo) throw new RuntimeException("Falta el precio de venta");

                BigDecimal stockAnterior = esNuevo ? BigDecimal.ZERO : repuesto.getStockActual();
                repuesto = repuestoItemRepository.save(repuesto);

                if (item.stockInicial != null && item.stockInicial.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal stockNuevo = stockAnterior.add(item.stockInicial);
                    repuesto.setStockActual(stockNuevo);
                    repuesto = repuestoItemRepository.save(repuesto);

                    MovimientoRepuesto movimiento = new MovimientoRepuesto();
                    movimiento.setTenantId(tenantId);
                    movimiento.setRepuesto(repuesto);
                    movimiento.setTipo(MovimientoRepuesto.TipoMovimiento.COMPRA);
                    movimiento.setCantidad(item.stockInicial);
                    movimiento.setStockAnterior(stockAnterior);
                    movimiento.setStockNuevo(stockNuevo);
                    movimiento.setMotivo("Carga masiva de inventario");
                    movimientoRepuestoRepository.save(movimiento);
                }

                if (esNuevo) resultado.creados++; else resultado.actualizados++;
            } catch (Exception e) {
                resultado.errores.add(new FilaConError(i + 1, e.getMessage()));
            }
        }
        return ResponseEntity.ok(resultado);
    }
}
