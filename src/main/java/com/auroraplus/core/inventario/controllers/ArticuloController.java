package com.auroraplus.core.inventario.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.core.inventario.entities.Kardex;
import com.auroraplus.core.inventario.entities.LoteArticulo;
import com.auroraplus.core.inventario.repositories.ArticuloRepository;
import com.auroraplus.core.inventario.repositories.KardexRepository;
import com.auroraplus.core.inventario.repositories.LoteArticuloRepository;
import com.auroraplus.core.inventario.services.InventarioService;
import com.auroraplus.core.financiero.entities.MovimientoCaja;
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

/**
 * CRUD de artículos de inventario base (Fase 1.4) — no existía ningún controller para esto todavía.
 *
 * Hardening de seguridad pre-piloto: casi todos los endpoints recibían tenantId por
 * @RequestParam y lo usaban directo para filtrar o para el chequeo "el artículo pertenece a este
 * tenant" — un chequeo así es una falsa sensación de seguridad cuando el propio tenantId contra
 * el que se compara viene del mismo request que un atacante controla (si mando el id de un
 * artículo ajeno junto con SU tenantId, el chequeo "pasa" porque ambos números salen de la misma
 * fuente no confiable). Ahora el tenant sale exclusivamente de TenantContext (JWT verificado) en
 * los 10 endpoints del controller.
 */
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
    private LoteArticuloRepository loteArticuloRepository;

    @Autowired
    private com.auroraplus.core.financiero.services.MotorFinancieroService motorFinancieroService;

    @GetMapping
    public List<Articulo> listar() {
        // El filtro de Hibernate habilitado en TenantInterceptor no llega vivo
        // hasta acá (ver hallazgo de seguridad — el enableFilter del
        // interceptor no persiste a la sesión que ejecuta esta query). En vez
        // de volver a depender de ese mecanismo frágil, se pide el tenant
        // explícito al repositorio.
        return articuloRepository.findByTenantId(TenantContext.getCurrentTenant());
    }

    @GetMapping("/{id}")
    public Articulo obtener(@PathVariable Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
        Articulo articulo = articuloRepository.findById(id).orElseThrow(() -> new RuntimeException("Artículo no encontrado"));
        if (!articulo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Artículo no pertenece a este tenant");
        }
        return articulo;
    }

    @GetMapping("/sku/{sku}")
    public Articulo buscarPorSku(@PathVariable String sku) {
        Long tenantId = TenantContext.getCurrentTenant();
        return articuloRepository.findBySkuAndTenantId(sku, tenantId)
            .orElseThrow(() -> new RuntimeException("Artículo no encontrado para el SKU: " + sku));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Articulo> crear(@RequestBody Articulo articulo) {
        Long tenantId = TenantContext.getCurrentTenant();
        articulo.setId(null);
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
        // costoUnitario llega tal cual lo tecleó el usuario, en articulo.monedaCosto (o en
        // la moneda base del tenant si no la mandó) — se normaliza acá a la moneda base
        // (LicenciaTenant.monedaBase, configurable por el Dueño/Administrador) para que
        // costoUnitario sea siempre comparable con precioVenta y con el resto del
        // inventario, sin importar en qué moneda se haya tecleado. Mismo criterio que
        // /entrada más abajo.
        if (articulo.getCostoUnitario() != null) {
            String monedaCosto = (articulo.getMonedaCosto() != null && !articulo.getMonedaCosto().isBlank())
                ? articulo.getMonedaCosto() : motorFinancieroService.obtenerMonedaBase(tenantId);
            registrarTasaDeCompraSiAplica(tenantId, monedaCosto, articulo.getTasaCambioAplicada());
            BigDecimal costoOriginal = articulo.getCostoUnitario();
            articulo.setCostoUnitario(costoCompra(tenantId, costoOriginal, monedaCosto, articulo.getUnidadesOrigenPorBase()));
            articulo.setMonedaCosto(monedaCosto);
            articulo.setCostoUnitarioOriginal(costoOriginal);
            articulo.setMonedaValoracion(motorFinancieroService.obtenerMonedaBase(tenantId));
        }
        Articulo guardado = articuloRepository.save(articulo);
        if (articulo.getCantidadInicial() != null && articulo.getCantidadInicial().signum() != 0) {
            EntradaRequest entrada = new EntradaRequest();
            entrada.cantidad = articulo.getCantidadInicial();
            entrada.costoUnitario = articulo.getCostoUnitarioOriginal();
            entrada.moneda = articulo.getMonedaCosto();
            entrada.unidadesOrigenPorBase = articulo.getUnidadesOrigenPorBase();
            entrada.metodoPago = articulo.getMetodoPagoInicial();
            entrada.fechaVencimiento = articulo.getFechaVencimientoInicial();
            entrada.motivo = "Compra / carga inicial";
            registrarEntrada(guardado.getId(), entrada);
        }
        return ResponseEntity.ok(guardado);
    }

    @PutMapping("/{id}/stock-minimo")
    public ResponseEntity<Articulo> actualizarStockMinimo(@PathVariable Long id, @RequestParam BigDecimal stockMinimo) {
        Long tenantId = TenantContext.getCurrentTenant();
        Articulo articulo = articuloRepository.findById(id).orElseThrow(() -> new RuntimeException("Artículo no encontrado"));
        if (tenantId == null || !articulo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Artículo no pertenece a este tenant");
        }
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
        public String monedaCosto; // Si se indica, costoUnitario está expresado en esta moneda.
        public BigDecimal unidadesOrigenPorBase; // 1 moneda base = X moneda de compra.
        // Aurora Retail — opcionales, ignorados por las demás verticales.
        public String codigoBarras;
        public String principioActivo;
    }

    /** Corrige datos del artículo (nombre, categoría, unidad, costo, precio de venta, stock mínimo) — NO toca stockActual, que solo cambia vía Kardex (entrada/salida/ajuste) para no perder el rastro de auditoría. */
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<Articulo> editar(@PathVariable Long id, @RequestBody EditarArticuloRequest request) {
        com.auroraplus.core.auth.AuthContext.exigirRol("DUENO_ADMIN", "ENCARGADO_INVENTARIO", "ADMINISTRADOR_FINCA");
        Long tenantId = TenantContext.getCurrentTenant();
        Articulo articulo = articuloRepository.findById(id).orElseThrow(() -> new RuntimeException("Artículo no encontrado"));
        if (!articulo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Artículo no pertenece a este tenant");
        }
        if (request.nombre != null && !request.nombre.isBlank()) articulo.setNombre(request.nombre.trim());
        if (request.categoria != null) articulo.setCategoria(request.categoria.isBlank() ? "General" : request.categoria.trim());
        if (request.unidadMedida != null && !request.unidadMedida.isBlank()) articulo.setUnidadMedida(request.unidadMedida.trim());
        if (request.costoUnitario != null) {
            if (request.costoUnitario.signum() < 0) throw new IllegalArgumentException("El costo no puede ser negativo");
            if (request.monedaCosto == null) {
                articulo.setCostoUnitario(request.costoUnitario);
            } else {
                String base = motorFinancieroService.obtenerMonedaBase(tenantId);
                BigDecimal anterior = articulo.getCostoUnitario();
                BigDecimal normalizado;
                if (base.equals(request.monedaCosto)) normalizado = request.costoUnitario;
                else {
                    if (request.unidadesOrigenPorBase == null || request.unidadesOrigenPorBase.signum() <= 0)
                        throw new IllegalArgumentException("Indique cuántas unidades de la moneda de compra equivalen a 1 " + base);
                    normalizado = request.costoUnitario.divide(request.unidadesOrigenPorBase, 4, java.math.RoundingMode.HALF_UP);
                }
                if (!List.of("USD", "COP", "VES", "EUR").contains(request.monedaCosto)) throw new IllegalArgumentException("Moneda inválida");
                articulo.setCostoUnitario(normalizado);
                articulo.setMonedaValoracion(base);
                articulo.setCostoUnitarioOriginal(request.costoUnitario);
                articulo.setMonedaCosto(request.monedaCosto);
                if (anterior == null || anterior.compareTo(normalizado) != 0) {
                    Kardex auditoria = new Kardex();
                    auditoria.setTenantId(tenantId);
                    auditoria.setArticulo(articulo);
                    auditoria.setTipoOperacion(Kardex.TipoOperacion.ENTRADA);
                    auditoria.setCantidad(BigDecimal.ZERO);
                    auditoria.setCostoUnitario(normalizado);
                    auditoria.setMotivo("Corrección de costo: " + anterior + " → " + normalizado + " " + base
                        + "; original " + request.costoUnitario + " " + request.monedaCosto
                        + "; 1 " + base + " = " + (request.unidadesOrigenPorBase == null ? BigDecimal.ONE : request.unidadesOrigenPorBase) + " " + request.monedaCosto);
                    kardexRepository.save(auditoria);
                }
            }
        }
        if (request.precioVenta != null) articulo.setPrecioVenta(request.precioVenta);
        if (request.stockMinimo != null) articulo.setStockMinimo(request.stockMinimo);
        if (request.sku != null && !request.sku.isBlank()) articulo.setSku(request.sku.trim());
        if (request.codigoBarras != null) articulo.setCodigoBarras(request.codigoBarras.isBlank() ? null : request.codigoBarras.trim());
        if (request.principioActivo != null) articulo.setPrincipioActivo(request.principioActivo.isBlank() ? null : request.principioActivo.trim());
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
    public ResponseEntity<Articulo> ajustarStock(@PathVariable Long id, @RequestBody AjustarStockRequest request) {
        com.auroraplus.core.auth.AuthContext.exigirRol("DUENO_ADMIN", "ENCARGADO_INVENTARIO", "ADMINISTRADOR_FINCA");
        Long tenantId = TenantContext.getCurrentTenant();
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
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
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
    public List<Articulo> alertasStockMinimo() {
        return articuloRepository.findConStockBajoMinimo(TenantContext.getCurrentTenant());
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
        // Opcionales: si vienen, además de sumar el stock se registra el gasto
        // real (EGRESO) de cantidad*costoUnitario en esta moneda/método — para
        // el reabastecimiento rápido desde Inventario, que no pasa por una
        // factura formal de Compras & Proveedores y por eso antes no dejaba
        // ningún rastro de cuánta plata salió de caja.
        public String metodoPago;
        // Moneda en la que el usuario tecleó costoUnitario (ej. "COP" si compró en
        // pesos). Si viene vacío, se asume que ya está en la moneda base del tenant.
        public String moneda;
        // Tasa concreta indicada por el proveedor para ESTA compra, expresada
        // como 1 unidad de moneda -> moneda base del negocio.
        public BigDecimal tasaCambioAplicada;
        public BigDecimal unidadesOrigenPorBase;
    }

    /** Entrada de stock (compra/reposición) — actualiza también el costo unitario vigente del artículo. */
    @PostMapping("/{id}/entrada")
    @Transactional
    public ResponseEntity<Kardex> registrarEntrada(@PathVariable Long id, @RequestBody EntradaRequest request) {
        Long tenantId = TenantContext.getCurrentTenant();
        Articulo articulo = articuloRepository.findById(id).orElseThrow(() -> new RuntimeException("Artículo no encontrado"));
        if (!articulo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Artículo no pertenece a este tenant");
        }
        if (request.cantidad == null || request.cantidad.signum() <= 0) throw new IllegalArgumentException("La cantidad debe ser mayor a cero");
        if (request.costoUnitario != null && request.costoUnitario.signum() < 0) throw new IllegalArgumentException("El costo no puede ser negativo");
        String monedaBaseTenant = motorFinancieroService.obtenerMonedaBase(tenantId);
        // costoUnitario del request viene tal cual lo tecleó el usuario, en
        // request.moneda (o ya en la moneda base si no la mandó) — se convierte acá
        // a la moneda base del tenant ANTES de guardarlo: costoUnitario del
        // artículo siempre debe quedar en esa moneda para que sea comparable con
        // precioVenta y con el resto del inventario (ver también ArticuloController.crear
        // y CompraInsumoHorecaService, que ya seguían este mismo criterio). El
        // frontend ya NO convierte nada de antemano, evita que las dos conversiones
        // (frontend a USD fijo, backend a la moneda base real) puedan divergir.
        if (request.costoUnitario != null) {
            String monedaCosto = (request.moneda != null && !request.moneda.isBlank()) ? request.moneda : monedaBaseTenant;
            registrarTasaDeCompraSiAplica(tenantId, monedaCosto, request.tasaCambioAplicada);
            BigDecimal costoOriginal = request.costoUnitario;
            articulo.setCostoUnitario(costoCompra(tenantId, costoOriginal, monedaCosto, request.unidadesOrigenPorBase));
            articulo.setMonedaCosto(monedaCosto);
            articulo.setCostoUnitarioOriginal(costoOriginal);
            articulo.setMonedaValoracion(monedaBaseTenant);
            articuloRepository.save(articulo);
        }
        BigDecimal costoAplicado = articulo.getCostoUnitario();
        Kardex movimiento = inventarioService.registrarMovimientoKardex(id, tenantId, Kardex.TipoOperacion.ENTRADA,
            request.cantidad, costoAplicado, request.motivo != null ? request.motivo : "Entrada de stock");

        if (request.metodoPago != null && !request.metodoPago.isBlank() && costoAplicado != null) {
            // costoAplicado (costoUnitario del artículo) ya está en la moneda base del
            // tenant. El gasto en caja se registra en la moneda real con la que se
            // pagó, así que ese total en la base hay que convertirlo a esa moneda
            // antes de guardarlo — guardarlo tal cual etiquetado con otra moneda
            // infla o reduce el gasto por el valor entero de la tasa de cambio.
            BigDecimal montoGastoBase = costoAplicado.multiply(request.cantidad);
            if (montoGastoBase.compareTo(BigDecimal.ZERO) > 0) {
                String monedaGasto = (request.moneda != null && !request.moneda.isBlank()) ? request.moneda : monedaBaseTenant;
                // Conservar exactamente lo pagado: reconvertir el costo redondeado altera el egreso.
                BigDecimal montoGasto = request.costoUnitario != null
                    ? request.costoUnitario.multiply(request.cantidad).setScale(2, java.math.RoundingMode.HALF_UP)
                    : motorFinancieroService.convertirMoneda(tenantId, montoGastoBase, monedaBaseTenant, monedaGasto);
                motorFinancieroService.registrarCompraConEquivalencia(tenantId, montoGasto, monedaGasto, montoGastoBase,
                    "Reabastecimiento: " + articulo.getNombre() + " (" + request.metodoPago + ")", id);
            }
        }

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

    private BigDecimal costoCompra(Long tenant, BigDecimal original, String moneda, BigDecimal unidadesPorBase) {
        if (original == null || original.signum() < 0) throw new IllegalArgumentException("El costo no puede ser negativo");
        if (!List.of("USD", "COP", "VES", "EUR").contains(moneda)) throw new IllegalArgumentException("Moneda inválida");
        if (unidadesPorBase == null) return motorFinancieroService.convertirCostoAMonedaBase(tenant, original, moneda);
        if (unidadesPorBase.signum() <= 0) throw new IllegalArgumentException("La tasa debe ser mayor a cero");
        if (moneda.equals(motorFinancieroService.obtenerMonedaBase(tenant))) return original;
        return original.divide(unidadesPorBase, 4, java.math.RoundingMode.HALF_UP);
    }

    private void registrarTasaDeCompraSiAplica(Long tenantId, String monedaOrigen, BigDecimal tasaAplicada) {
        String monedaBase = motorFinancieroService.obtenerMonedaBase(tenantId);
        if (tasaAplicada == null || monedaOrigen.equals(monedaBase)) return;
        if (tasaAplicada.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("La tasa aplicada a la compra debe ser mayor a cero");
        }
        // Para el par Bs/COP la convención de Aurora siempre es única:
        // 1 Bs = X COP. Si la compra vino en COP y la base es VES, el motor
        // encuentra esa misma tasa en sentido inverso y DIVIDE, en vez de
        // pedirle al usuario una segunda tasa con otra convención.
        boolean parVesCop = ("VES".equals(monedaOrigen) && "COP".equals(monedaBase))
            || ("COP".equals(monedaOrigen) && "VES".equals(monedaBase));
        if (parVesCop) {
            motorFinancieroService.actualizarTasa(tenantId, "VES", "COP", tasaAplicada, "COMPRA");
        } else {
            motorFinancieroService.actualizarTasa(tenantId, monedaOrigen, monedaBase, tasaAplicada, "COMPRA");
        }
    }

    @GetMapping("/{id}/kardex")
    public List<Kardex> kardex(@PathVariable Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
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
        public BigDecimal precioVenta;
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
    public ResponseEntity<ResultadoImportacion> importarLote(@RequestBody List<ItemImportacion> items) {
        Long tenantId = TenantContext.getCurrentTenant();
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
                if (item.precioVenta != null) articulo.setPrecioVenta(item.precioVenta);
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
