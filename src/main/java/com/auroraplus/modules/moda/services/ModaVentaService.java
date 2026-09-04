package com.auroraplus.modules.moda.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.core.sync.IdempotenciaService;
import com.auroraplus.modules.moda.entities.*;
import com.auroraplus.modules.moda.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Venta de retail (Moda): descuenta stock por variante, deja rastro en el
 * Kárdex, cobra en EFECTIVO (ingresa a caja) o con GIFT_CARD (descuenta su
 * saldo — no genera ingreso nuevo, ya se cobró cuando se emitió la tarjeta),
 * y acumula puntos de fidelización al cliente si la venta lo identifica
 * (Subfase 6.3).
 */
@Service
public class ModaVentaService {

    @Autowired
    private VentaModaRepository ventaModaRepository;

    @Autowired
    private VarianteModaRepository varianteModaRepository;

    @Autowired
    private ClienteModaRepository clienteModaRepository;

    @Autowired
    private GiftCardRepository giftCardRepository;

    @Autowired
    private MovimientoModaRepository movimientoModaRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    @Autowired
    private IdempotenciaService idempotenciaService;

    // 1 punto de fidelización por cada $1 (moneda base) del total de la venta.
    private static final BigDecimal PUNTOS_POR_DOLAR = BigDecimal.ONE;

    public static class ItemVenta {
        public Long varianteId;
        public BigDecimal cantidad;
    }

    @Transactional
    public VentaModa registrarVenta(Long tenantId, String numeroTicket, Long clienteId, String metodoPago,
                                     String codigoGiftCard, List<ItemVenta> items) {
        return registrarVenta(tenantId, numeroTicket, clienteId, metodoPago, codigoGiftCard, items, null, null, null);
    }

    /** monedaPago/montoRecibido solo aplican cuando metodoPago=EFECTIVO y el cliente paga en una moneda distinta a la base del tenant. */
    @Transactional
    public VentaModa registrarVenta(Long tenantId, String numeroTicket, Long clienteId, String metodoPago,
                                     String codigoGiftCard, List<ItemVenta> items, String monedaPago, BigDecimal montoRecibido) {
        return registrarVenta(tenantId, numeroTicket, clienteId, metodoPago, codigoGiftCard, items, monedaPago, montoRecibido, null);
    }

    /** claveIdempotencia (opcional): evita duplicar la venta si el POS offline reintenta el envío (ver IdempotenciaService). */
    @Transactional
    public VentaModa registrarVenta(Long tenantId, String numeroTicket, Long clienteId, String metodoPago,
                                     String codigoGiftCard, List<ItemVenta> items, String monedaPago, BigDecimal montoRecibido,
                                     String claveIdempotencia) {
        Optional<Long> existente = idempotenciaService.obtenerSiYaProcesada(tenantId, claveIdempotencia);
        if (existente.isPresent()) {
            return ventaModaRepository.findById(existente.get())
                .orElseThrow(() -> new RuntimeException("Operación idempotente inconsistente: venta " + existente.get() + " no encontrada"));
        }

        if (items == null || items.isEmpty()) {
            throw new RuntimeException("La venta debe tener al menos un ítem");
        }
        if (!"EFECTIVO".equals(metodoPago) && !"GIFT_CARD".equals(metodoPago)) {
            throw new RuntimeException("Método de pago inválido: use EFECTIVO o GIFT_CARD");
        }

        VentaModa venta = new VentaModa();
        venta.setTenantId(tenantId);
        venta.setNumeroTicket(numeroTicket);
        venta.setMetodoPago(metodoPago);
        venta.setFecha(LocalDateTime.now());

        if (clienteId != null) {
            ClienteModa cliente = clienteModaRepository.findById(clienteId)
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));
            if (!cliente.getTenantId().equals(tenantId)) {
                throw new RuntimeException("Violación de seguridad: Cliente no pertenece a este tenant");
            }
            venta.setCliente(cliente);
        }

        BigDecimal totalVenta = BigDecimal.ZERO;

        for (ItemVenta itemVenta : items) {
            if (itemVenta.cantidad == null || itemVenta.cantidad.compareTo(BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("La cantidad vendida debe ser mayor a cero");
            }

            VarianteModa variante = varianteModaRepository.findById(itemVenta.varianteId)
                .orElseThrow(() -> new RuntimeException("Variante no encontrada: " + itemVenta.varianteId));

            if (!variante.getTenantId().equals(tenantId)) {
                throw new RuntimeException("Violación de seguridad: Variante no pertenece a este tenant");
            }
            if (variante.getStockActual().compareTo(itemVenta.cantidad) < 0) {
                throw new RuntimeException("Stock insuficiente para " + variante.getProducto().getNombre()
                    + " (Talla " + variante.getTalla() + ", " + variante.getColor() + "): disponible " + variante.getStockActual());
            }

            BigDecimal precioUnitario = variante.getProducto().getPrecioVenta();
            BigDecimal subtotal = itemVenta.cantidad.multiply(precioUnitario).setScale(2, RoundingMode.HALF_UP);
            totalVenta = totalVenta.add(subtotal);

            BigDecimal stockAnterior = variante.getStockActual();
            BigDecimal stockNuevo = stockAnterior.subtract(itemVenta.cantidad);
            variante.setStockActual(stockNuevo);
            varianteModaRepository.save(variante);

            DetalleVentaModa detalle = new DetalleVentaModa();
            detalle.setTenantId(tenantId);
            detalle.setVariante(variante);
            detalle.setCantidad(itemVenta.cantidad);
            detalle.setPrecioUnitario(precioUnitario);
            detalle.setSubtotal(subtotal);
            venta.addItem(detalle);

            MovimientoModa movimiento = new MovimientoModa();
            movimiento.setTenantId(tenantId);
            movimiento.setVariante(variante);
            movimiento.setTipo(MovimientoModa.TipoMovimiento.VENTA);
            movimiento.setCantidad(itemVenta.cantidad);
            movimiento.setStockAnterior(stockAnterior);
            movimiento.setStockNuevo(stockNuevo);
            movimiento.setMotivo("Venta ticket " + numeroTicket);
            movimientoModaRepository.save(movimiento);
        }

        venta.setTotal(totalVenta);

        if ("GIFT_CARD".equals(metodoPago)) {
            if (codigoGiftCard == null || codigoGiftCard.isBlank()) {
                throw new RuntimeException("Debe indicar el código de la gift card");
            }
            GiftCard giftCard = giftCardRepository.findByCodigo(codigoGiftCard)
                .orElseThrow(() -> new RuntimeException("Gift card no encontrada"));
            if (!giftCard.getTenantId().equals(tenantId)) {
                throw new RuntimeException("Violación de seguridad: Gift card no pertenece a este tenant");
            }
            if (!Boolean.TRUE.equals(giftCard.getActiva())) {
                throw new RuntimeException("La gift card está inactiva");
            }
            if (giftCard.getSaldoActual().compareTo(totalVenta) < 0) {
                throw new RuntimeException("Saldo insuficiente en la gift card: disponible " + giftCard.getSaldoActual() + ", requerido " + totalVenta);
            }
            giftCard.setSaldoActual(giftCard.getSaldoActual().subtract(totalVenta));
            giftCardRepository.save(giftCard);
            venta.setGiftCardUsada(giftCard);
            // No se registra INGRESO nuevo: el efectivo ya entró a caja cuando se emitió la gift card.
        } else {
            motorFinancieroService.registrarMovimientoMultiMoneda(tenantId, MovimientoCaja.TipoMovimiento.INGRESO,
                totalVenta, monedaPago, montoRecibido, "Venta Moda ticket " + numeroTicket);
        }

        if (venta.getCliente() != null) {
            BigDecimal puntos = totalVenta.multiply(PUNTOS_POR_DOLAR).setScale(2, RoundingMode.HALF_UP);
            venta.setPuntosOtorgados(puntos);
            ClienteModa cliente = venta.getCliente();
            cliente.setPuntosAcumulados(cliente.getPuntosAcumulados().add(puntos));
            clienteModaRepository.save(cliente);
        }

        VentaModa guardada = ventaModaRepository.save(venta);
        idempotenciaService.registrar(tenantId, claveIdempotencia, "venta_moda", guardada.getId());
        return guardada;
    }
}
