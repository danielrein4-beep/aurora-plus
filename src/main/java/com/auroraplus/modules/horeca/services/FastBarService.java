package com.auroraplus.modules.horeca.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.core.inventario.entities.Kardex;
import com.auroraplus.core.inventario.repositories.ArticuloRepository;
import com.auroraplus.core.inventario.services.InventarioService;
import com.auroraplus.core.sync.IdempotenciaService;
import com.auroraplus.modules.horeca.entities.FastBarTrago;
import com.auroraplus.modules.horeca.repositories.FastBarTragoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.Optional;

@Service
public class FastBarService {

    @Autowired
    private FastBarTragoRepository fastBarTragoRepository;

    @Autowired
    private ArticuloRepository articuloRepository;

    @Autowired
    private InventarioService inventarioService;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    @Autowired
    private IdempotenciaService idempotenciaService;

    /**
     * Venta rápida "en un clic" de un trago del Fast-Bar: descuenta de forma
     * fraccionada (mililitros) la botella asociada en inventario Y registra
     * el ingreso real en caja — antes SOLO descontaba inventario y devolvía
     * el monto como número, sin dejar ningún rastro en tesorería: el trago
     * salía del inventario pero el dinero nunca quedaba registrado en ningún
     * lado (bug real encontrado en auditoría, corregido aquí).
     *
     * claveIdempotencia (opcional): mismo patrón que toda venta del sistema —
     * evita duplicar el descuento e ingreso si el POS reintenta.
     */
    @Transactional
    public BigDecimal venderTragoRapido(Long fastBarTragoId, Long tenantId, Integer cantidadTragos) {
        return venderTragoRapido(fastBarTragoId, tenantId, cantidadTragos, null, null, null);
    }

    @Transactional
    public BigDecimal venderTragoRapido(Long fastBarTragoId, Long tenantId, Integer cantidadTragos,
                                         String monedaPago, BigDecimal montoRecibido, String claveIdempotencia) {
        Optional<Long> existente = idempotenciaService.obtenerSiYaProcesada(tenantId, claveIdempotencia);
        if (existente.isPresent()) {
            // No hay una entidad de "venta" propia que devolver (el resultado siempre fue
            // solo el monto) — se recalcula el mismo total sin repetir el descuento ni el
            // ingreso, que es lo único que de verdad hay que proteger de un reintento.
            FastBarTrago trago = fastBarTragoRepository.findById(fastBarTragoId)
                .orElseThrow(() -> new RuntimeException("Trago de Fast-Bar no encontrado"));
            return trago.getPrecioVenta().multiply(BigDecimal.valueOf(cantidadTragos));
        }

        if (cantidadTragos == null || cantidadTragos <= 0) {
            throw new RuntimeException("La cantidad de tragos debe ser mayor a cero");
        }

        FastBarTrago trago = fastBarTragoRepository.findById(fastBarTragoId)
            .orElseThrow(() -> new RuntimeException("Trago de Fast-Bar no encontrado"));

        if (!trago.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Trago no pertenece a este tenant");
        }

        Articulo botella = articuloRepository.findBySkuAndTenantId(trago.getBotellaSku(), tenantId)
            .orElseThrow(() -> new RuntimeException("Botella no encontrada en inventario: " + trago.getBotellaSku()));

        BigDecimal mililitrosADescontar = trago.getMililitrosPorTrago().multiply(BigDecimal.valueOf(cantidadTragos));

        inventarioService.registrarMovimientoKardex(
            botella.getId(),
            tenantId,
            Kardex.TipoOperacion.SALIDA,
            mililitrosADescontar,
            botella.getCostoUnitario(),
            "Venta rápida Fast-Bar: " + trago.getNombreTrago());

        BigDecimal totalVenta = trago.getPrecioVenta().multiply(BigDecimal.valueOf(cantidadTragos));

        MovimientoCaja movimiento = motorFinancieroService.registrarMovimientoMultiMoneda(tenantId, MovimientoCaja.TipoMovimiento.INGRESO,
            totalVenta, monedaPago, montoRecibido,
            "Venta rápida Fast-Bar: " + cantidadTragos + "x " + trago.getNombreTrago());

        idempotenciaService.registrar(tenantId, claveIdempotencia, "venta_fastbar_horeca", movimiento.getId());

        return totalVenta;
    }
}
