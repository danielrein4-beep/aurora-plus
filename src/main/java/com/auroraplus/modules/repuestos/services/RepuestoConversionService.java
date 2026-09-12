package com.auroraplus.modules.repuestos.services;

import com.auroraplus.core.crm.entities.Cliente;
import com.auroraplus.core.crm.repositories.ClienteRepository;
import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.core.sync.IdempotenciaService;
import com.auroraplus.modules.repuestos.entities.MovimientoRepuesto;
import com.auroraplus.modules.repuestos.entities.PresentacionRepuesto;
import com.auroraplus.modules.repuestos.entities.RepuestoItem;
import com.auroraplus.modules.repuestos.repositories.MovimientoRepuestoRepository;
import com.auroraplus.modules.repuestos.repositories.PresentacionRepuestoRepository;
import com.auroraplus.modules.repuestos.repositories.RepuestoItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

/**
 * Gestiona unidades fraccionadas y conversiones para el catálogo de repuestos:
 * un mismo ítem puede venderse por caja, por unidad individual, por metro o por
 * kilo, cada presentación con su propio factor de conversión hacia la unidad
 * base en la que se lleva el stock (RepuestoItem.stockActual).
 */
@Service
public class RepuestoConversionService {

    @Autowired
    private RepuestoItemRepository repuestoItemRepository;

    @Autowired
    private PresentacionRepuestoRepository presentacionRepuestoRepository;

    @Autowired
    private MovimientoRepuestoRepository movimientoRepuestoRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    @Autowired
    private IdempotenciaService idempotenciaService;

    @Autowired
    private OrdenCompraSugeridaService ordenCompraSugeridaService;

    @Autowired
    private ClienteRepository clienteRepository;

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(RepuestoConversionService.class);

    // Repuestos no tiene una entidad "VentaRepuesto" persistida (a diferencia de
    // las demás verticales) — solo queda el MovimientoRepuesto (Kardex) y el
    // MovimientoCaja. Por eso, si una clave de idempotencia ya se usó, NO se
    // puede reconstruir la respuesta original (total, si fue Mayorista, etc.):
    // se rechaza el reintento con un mensaje claro en vez de fallar en silencio
    // o, peor, duplicar el descuento de stock y el ingreso en caja.
    private void verificarNoDuplicada(Long tenantId, String claveIdempotencia) {
        if (idempotenciaService.obtenerSiYaProcesada(tenantId, claveIdempotencia).isPresent()) {
            throw new RuntimeException("Esta venta ya fue procesada anteriormente (clave de idempotencia repetida) — "
                + "no se repite para evitar duplicar el descuento de stock y el ingreso en caja. "
                + "Consulte el Kardex del repuesto para confirmar el movimiento ya registrado.");
        }
    }

    // El precio del catálogo (RepuestoItem.precioVenta) está fijado en la
    // moneda base del tenant (LicenciaTenant.monedaBase). El cliente puede
    // pagar en otra moneda — ver registrarIngresoCaja/MotorFinancieroService.

    private MovimientoRepuesto registrarMovimientoVenta(RepuestoItem repuesto, BigDecimal cantidad, BigDecimal stockAnterior,
                                                         BigDecimal stockNuevo, String motivo, Long clienteId, BigDecimal total) {
        MovimientoRepuesto movimiento = new MovimientoRepuesto();
        movimiento.setTenantId(repuesto.getTenantId());
        movimiento.setRepuesto(repuesto);
        movimiento.setTipo(MovimientoRepuesto.TipoMovimiento.VENTA);
        movimiento.setCantidad(cantidad);
        movimiento.setStockAnterior(stockAnterior);
        movimiento.setStockNuevo(stockNuevo);
        movimiento.setMotivo(motivo);
        movimiento.setClienteId(clienteId);
        movimiento.setTotal(total);
        return movimientoRepuestoRepository.save(movimiento);
    }

    // Smart Restocking: se llama después de CADA venta que descuenta stock. Un
    // fallo acá (ej. proveedor principal borrado a mano en otra pestaña) jamás
    // debe tumbar una venta ya cobrada — por eso queda aislado en su propio
    // try/catch en vez de dejar que la excepción suba y revierta la transacción.
    private void intentarGenerarBorrador(RepuestoItem repuesto) {
        try {
            ordenCompraSugeridaService.generarBorradorSiAplica(repuesto);
        } catch (Exception e) {
            log.error("No se pudo evaluar Smart Restocking para el repuesto {}: {}", repuesto.getId(), e.getMessage(), e);
        }
    }

    /** Registra el ingreso real en caja (core.financiero), convirtiendo si el cliente paga en otra moneda que la base del tenant. */
    private void registrarIngresoCaja(Long tenantId, BigDecimal montoBase, String monedaPago, BigDecimal montoRecibido, String concepto) {
        motorFinancieroService.registrarMovimientoMultiMoneda(tenantId, MovimientoCaja.TipoMovimiento.INGRESO,
            montoBase, monedaPago, montoRecibido, concepto);
    }

    public PresentacionRepuesto registrarPresentacion(Long repuestoId, Long tenantId, String nombrePresentacion,
                                                        BigDecimal factorConversion, BigDecimal precioVenta) {
        RepuestoItem repuesto = repuestoItemRepository.findById(repuestoId)
            .orElseThrow(() -> new RuntimeException("Repuesto no encontrado"));

        if (!repuesto.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Repuesto no pertenece a este tenant");
        }

        if (factorConversion == null || factorConversion.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("El factor de conversión debe ser mayor a cero");
        }

        PresentacionRepuesto presentacion = new PresentacionRepuesto();
        presentacion.setTenantId(tenantId);
        presentacion.setRepuesto(repuesto);
        presentacion.setNombrePresentacion(nombrePresentacion);
        presentacion.setFactorConversion(factorConversion);
        presentacion.setPrecioVenta(precioVenta);

        return presentacionRepuestoRepository.save(presentacion);
    }

    /**
     * Calcula la equivalencia en unidad base de una cantidad vendida en una
     * presentación fraccionada (ej: 3 cajas de 12 unidades = 36 unidades base).
     */
    public BigDecimal calcularEquivalenciaEnUnidadBase(PresentacionRepuesto presentacion, BigDecimal cantidadVendida) {
        return cantidadVendida.multiply(presentacion.getFactorConversion());
    }

    /**
     * Despacha (descuenta del inventario) una venta expresada en una presentación
     * fraccionada, convirtiendo automáticamente a la unidad base antes de validar
     * y descontar el stock. Devuelve el monto total a cobrar.
     */
    @Transactional
    public BigDecimal despacharPorPresentacion(Long presentacionId, Long tenantId, BigDecimal cantidadVendida) {
        return despacharPorPresentacion(presentacionId, tenantId, cantidadVendida, null, null, null, null);
    }

    @Transactional
    public BigDecimal despacharPorPresentacion(Long presentacionId, Long tenantId, BigDecimal cantidadVendida, String monedaPago, BigDecimal montoRecibido) {
        return despacharPorPresentacion(presentacionId, tenantId, cantidadVendida, monedaPago, montoRecibido, null, null);
    }

    @Transactional
    public BigDecimal despacharPorPresentacion(Long presentacionId, Long tenantId, BigDecimal cantidadVendida, String monedaPago,
                                                BigDecimal montoRecibido, String claveIdempotencia) {
        return despacharPorPresentacion(presentacionId, tenantId, cantidadVendida, monedaPago, montoRecibido, claveIdempotencia, null);
    }

    @Transactional
    public BigDecimal despacharPorPresentacion(Long presentacionId, Long tenantId, BigDecimal cantidadVendida, String monedaPago,
                                                BigDecimal montoRecibido, String claveIdempotencia, Long clienteId) {
        verificarNoDuplicada(tenantId, claveIdempotencia);

        if (cantidadVendida == null || cantidadVendida.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("La cantidad vendida debe ser mayor a cero");
        }

        PresentacionRepuesto presentacion = presentacionRepuestoRepository.findById(presentacionId)
            .orElseThrow(() -> new RuntimeException("Presentación no encontrada"));

        if (!presentacion.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Presentación no pertenece a este tenant");
        }

        // Bloqueo pesimista sobre el RepuestoItem real (no el que trae la asociación lazy de
        // la presentación) — es la fila cuyo stockActual se va a leer, validar y descontar.
        RepuestoItem repuesto = repuestoItemRepository.buscarConBloqueoPesimista(presentacion.getRepuesto().getId())
            .orElseThrow(() -> new RuntimeException("Repuesto no encontrado"));

        BigDecimal cantidadEnUnidadBase = calcularEquivalenciaEnUnidadBase(presentacion, cantidadVendida);

        if (repuesto.getStockActual().compareTo(cantidadEnUnidadBase) < 0) {
            throw new RuntimeException("Stock insuficiente en unidad base (" + repuesto.getUnidadBase()
                + ") para despachar " + cantidadVendida + " " + presentacion.getNombrePresentacion());
        }

        BigDecimal stockAnterior = repuesto.getStockActual();
        BigDecimal stockNuevo = stockAnterior.subtract(cantidadEnUnidadBase);
        repuesto.setStockActual(stockNuevo);
        repuestoItemRepository.save(repuesto);

        BigDecimal precioUnitarioPresentacion = aplicarDescuentoClienteMayorista(presentacion.getPrecioVenta(), clienteId, tenantId);
        BigDecimal totalVenta = cantidadVendida.multiply(precioUnitarioPresentacion).setScale(2, RoundingMode.HALF_UP);

        MovimientoRepuesto movimiento = registrarMovimientoVenta(repuesto, cantidadEnUnidadBase, stockAnterior, stockNuevo,
            "Venta " + cantidadVendida + " " + presentacion.getNombrePresentacion(), clienteId, totalVenta);

        registrarIngresoCaja(tenantId, totalVenta, monedaPago, montoRecibido,
            "Venta repuesto " + repuesto.getCodigoSku() + " (" + cantidadVendida + " " + presentacion.getNombrePresentacion() + ")");

        idempotenciaService.registrar(tenantId, claveIdempotencia, "venta_repuestos_presentacion", movimiento.getId());

        intentarGenerarBorrador(repuesto);

        return totalVenta;
    }

    /**
     * Subfase 5.3 — Listas de Precios y Volumen: determina el precio unitario
     * aplicable (Mayorista o Detal) según la cantidad agregada a la factura.
     * Si el ítem no tiene tarifa mayorista configurada, siempre cobra Detal.
     */
    public BigDecimal calcularPrecioUnitarioPorVolumen(RepuestoItem repuesto, BigDecimal cantidad) {
        boolean tieneTarifaMayorista = repuesto.getPrecioMayorista() != null
            && repuesto.getCantidadMinimaMayorista() != null
            && repuesto.getPrecioMayorista().compareTo(BigDecimal.ZERO) > 0;

        if (tieneTarifaMayorista && cantidad.compareTo(repuesto.getCantidadMinimaMayorista()) >= 0) {
            return repuesto.getPrecioMayorista();
        }
        return repuesto.getPrecioVenta();
    }

    /**
     * Regla ABC (clasificación automática, ver ClasificacionClientesJob): un
     * cliente MAYORISTA lleva su descuento aplicado sin que el cajero tenga
     * que acordarse de teclearlo — se aplica sobre el precio YA resuelto
     * (Detal o Mayorista por volumen), nunca lo reemplaza.
     */
    private BigDecimal aplicarDescuentoClienteMayorista(BigDecimal precioUnitario, Long clienteId, Long tenantId) {
        if (clienteId == null) return precioUnitario;
        return clienteRepository.findById(clienteId)
            .filter(c -> tenantId.equals(c.getTenantId()))
            .filter(c -> c.getClasificacion() == Cliente.Clasificacion.MAYORISTA)
            .map(Cliente::getDescuentoAutomaticoPorcentaje)
            .filter(pct -> pct != null && pct.compareTo(BigDecimal.ZERO) > 0)
            .map(pct -> precioUnitario.multiply(BigDecimal.ONE.subtract(pct.divide(new BigDecimal("100"))))
                .setScale(2, RoundingMode.HALF_UP))
            .orElse(precioUnitario);
    }

    /**
     * Venta directa de un repuesto en su unidad base (sin pasar por una
     * presentación fraccionada), aplicando automáticamente el precio Mayorista
     * o Detal según el volumen. Descuenta stock y devuelve el desglose.
     */
    @Transactional
    public ResultadoVenta venderPorVolumen(Long repuestoId, Long tenantId, BigDecimal cantidad) {
        return venderPorVolumen(repuestoId, tenantId, cantidad, null, null, null, null);
    }

    @Transactional
    public ResultadoVenta venderPorVolumen(Long repuestoId, Long tenantId, BigDecimal cantidad, String monedaPago, BigDecimal montoRecibido) {
        return venderPorVolumen(repuestoId, tenantId, cantidad, monedaPago, montoRecibido, null, null);
    }

    @Transactional
    public ResultadoVenta venderPorVolumen(Long repuestoId, Long tenantId, BigDecimal cantidad, String monedaPago,
                                            BigDecimal montoRecibido, String claveIdempotencia) {
        return venderPorVolumen(repuestoId, tenantId, cantidad, monedaPago, montoRecibido, claveIdempotencia, null);
    }

    @Transactional
    public ResultadoVenta venderPorVolumen(Long repuestoId, Long tenantId, BigDecimal cantidad, String monedaPago,
                                            BigDecimal montoRecibido, String claveIdempotencia, Long clienteId) {
        verificarNoDuplicada(tenantId, claveIdempotencia);

        if (cantidad == null || cantidad.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("La cantidad debe ser mayor a cero");
        }

        // Bloqueo pesimista: si dos ventas del mismo repuesto llegan al mismo tiempo, la
        // segunda transacción espera a que la primera confirme antes de leer stockActual —
        // sin esto, ambas podían leer el mismo stock, pasar la validación y sobrevender.
        RepuestoItem repuesto = repuestoItemRepository.buscarConBloqueoPesimista(repuestoId)
            .orElseThrow(() -> new RuntimeException("Repuesto no encontrado"));

        if (!repuesto.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Repuesto no pertenece a este tenant");
        }

        if (repuesto.getStockActual().compareTo(cantidad) < 0) {
            throw new RuntimeException("Stock insuficiente: disponible " + repuesto.getStockActual()
                + " " + repuesto.getUnidadBase());
        }

        BigDecimal precioUnitarioAplicado = calcularPrecioUnitarioPorVolumen(repuesto, cantidad);
        precioUnitarioAplicado = aplicarDescuentoClienteMayorista(precioUnitarioAplicado, clienteId, tenantId);
        boolean esMayorista = precioUnitarioAplicado.compareTo(repuesto.getPrecioVenta()) != 0;
        BigDecimal total = cantidad.multiply(precioUnitarioAplicado).setScale(2, RoundingMode.HALF_UP);

        BigDecimal stockAnterior = repuesto.getStockActual();
        BigDecimal stockNuevo = stockAnterior.subtract(cantidad);
        repuesto.setStockActual(stockNuevo);
        repuestoItemRepository.save(repuesto);

        MovimientoRepuesto movimiento = registrarMovimientoVenta(repuesto, cantidad, stockAnterior, stockNuevo,
            "Venta directa" + (esMayorista ? " (tarifa Mayorista)" : " (tarifa Detal)"), clienteId, total);

        registrarIngresoCaja(tenantId, total, monedaPago, montoRecibido, "Venta repuesto " + repuesto.getCodigoSku()
            + " x" + cantidad + (esMayorista ? " (Mayorista)" : " (Detal)"));

        idempotenciaService.registrar(tenantId, claveIdempotencia, "venta_repuestos_volumen", movimiento.getId());

        intentarGenerarBorrador(repuesto);

        return new ResultadoVenta(precioUnitarioAplicado, total, esMayorista);
    }

    public static class ResultadoVenta {
        private final BigDecimal precioUnitarioAplicado;
        private final BigDecimal total;
        private final boolean esMayorista;

        public ResultadoVenta(BigDecimal precioUnitarioAplicado, BigDecimal total, boolean esMayorista) {
            this.precioUnitarioAplicado = precioUnitarioAplicado;
            this.total = total;
            this.esMayorista = esMayorista;
        }

        public BigDecimal getPrecioUnitarioAplicado() { return precioUnitarioAplicado; }
        public BigDecimal getTotal() { return total; }
        public boolean isEsMayorista() { return esMayorista; }
    }
}
