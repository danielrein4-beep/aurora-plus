package com.auroraplus.core.financiero.services;

import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.entities.TasaCambio;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import com.auroraplus.core.financiero.repositories.TasaCambioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Service
public class MotorFinancieroService {

    @Autowired
    private TasaCambioRepository tasaCambioRepository;

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private MovimientoCajaRepository movimientoCajaRepository;

    /**
     * Registra una tasa nueva (nunca sobreescribe — inserta una fila para
     * conservar el historial de fluctuación).
     */
    public TasaCambio actualizarTasa(Long tenantId, String monedaOrigen, String monedaDestino, BigDecimal tasa, String origen) {
        TasaCambio nueva = new TasaCambio();
        nueva.setTenantId(tenantId);
        nueva.setMonedaOrigen(monedaOrigen);
        nueva.setMonedaDestino(monedaDestino);
        nueva.setTasa(tasa);
        nueva.setOrigenApi(origen != null ? origen : "MANUAL");
        nueva.setFechaActualizacion(LocalDateTime.now());
        return tasaCambioRepository.save(nueva);
    }

    /**
     * Convierte un monto de una moneda a otra utilizando la tasa más reciente
     * de ESE tenant. Si no encuentra la tasa directa pero sí la inversa
     * (moneda_destino -> moneda_origen), la usa dividiendo — así con registrar
     * una sola dirección (ej. USD->VES) ya funciona la conversión en ambos
     * sentidos, sin obligar a cargar cada tasa dos veces.
     */
    public BigDecimal convertirMoneda(Long tenantId, BigDecimal monto, String monedaOrigen, String monedaDestino) {
        if (monedaOrigen.equals(monedaDestino)) return monto;

        var directa = tasaCambioRepository
            .findTopByTenantIdAndMonedaOrigenAndMonedaDestinoOrderByFechaActualizacionDesc(tenantId, monedaOrigen, monedaDestino);
        if (directa.isPresent()) {
            return monto.multiply(directa.get().getTasa()).setScale(2, RoundingMode.HALF_UP);
        }

        var inversa = tasaCambioRepository
            .findTopByTenantIdAndMonedaOrigenAndMonedaDestinoOrderByFechaActualizacionDesc(tenantId, monedaDestino, monedaOrigen);
        if (inversa.isPresent()) {
            return monto.divide(inversa.get().getTasa(), 2, RoundingMode.HALF_UP);
        }

        throw new RuntimeException("No hay tasa de cambio registrada entre " + monedaOrigen + " y " + monedaDestino
            + " para este tenant. Regístrela primero en /api/financiero/tasas.");
    }

    /**
     * Convierte un monto recibido en cualquier moneda a la moneda base
     * configurada para el tenant (LicenciaTenant.monedaBase) — el punto de
     * entrada que deben usar los módulos de venta al registrar un cobro en
     * una moneda distinta a la que opera el negocio.
     */
    public BigDecimal convertirAMonedaBase(Long tenantId, BigDecimal monto, String monedaOrigen) {
        String monedaBase = licenciaTenantRepository.findByTenantId(tenantId)
            .map(t -> t.getMonedaBase())
            .orElse("USD");
        return convertirMoneda(tenantId, monto, monedaOrigen, monedaBase);
    }

    /**
     * Lógica de facturación fraccionada: calcula el saldo restante a pagar en
     * la moneda base del tenant después de un pago parcial en otra moneda.
     */
    public BigDecimal calcularSaldoRestanteMultimoneda(Long tenantId, BigDecimal totalFacturaBase, BigDecimal pagoParcial,
                                                         String monedaPagoParcial, String monedaSaldoRestante) {
        BigDecimal pagoParcialBase = convertirAMonedaBase(tenantId, pagoParcial, monedaPagoParcial);

        BigDecimal saldoPendienteBase = totalFacturaBase.subtract(pagoParcialBase);
        if (saldoPendienteBase.compareTo(BigDecimal.ZERO) <= 0) return BigDecimal.ZERO;

        String monedaBase = licenciaTenantRepository.findByTenantId(tenantId).map(t -> t.getMonedaBase()).orElse("USD");
        return convertirMoneda(tenantId, saldoPendienteBase, monedaBase, monedaSaldoRestante);
    }

    public String obtenerMonedaBase(Long tenantId) {
        return licenciaTenantRepository.findByTenantId(tenantId).map(t -> t.getMonedaBase()).orElse("USD");
    }

    /**
     * Punto único que deben usar TODOS los módulos de venta para registrar un
     * cobro en caja: el precio del negocio está fijado en su moneda base, pero
     * el cliente puede pagar en otra moneda (ej. negocio en USD, cliente paga
     * en VES). El movimiento SIEMPRE queda registrado en la moneda que
     * físicamente entró a la caja (para que el arqueo por moneda sea real —
     * "hay X dólares, Y bolívares" — no todo mezclado), con el equivalente en
     * la moneda base guardado como referencia para reportes consolidados.
     *
     * Si monedaPago es null o igual a la moneda base, no hay conversión.
     * Si es distinta, exige montoRecibido y valida que alcance para cubrir
     * montoBase — si no alcanza, revienta y no se registra nada (el llamador
     * debe estar en una transacción para que el resto de la operación también
     * se revierta, ej. no descontar inventario si el pago no alcanzó).
     */
    @Transactional
    public MovimientoCaja registrarMovimientoMultiMoneda(Long tenantId, MovimientoCaja.TipoMovimiento tipo, BigDecimal montoBase,
                                                            String monedaPago, BigDecimal montoRecibido, String concepto) {
        String monedaBase = obtenerMonedaBase(tenantId);
        String monedaCobro = (monedaPago != null && !monedaPago.isBlank()) ? monedaPago : monedaBase;

        MovimientoCaja movimiento = new MovimientoCaja();
        movimiento.setTenantId(tenantId);
        movimiento.setTipo(tipo);
        movimiento.setConcepto(concepto);

        if (monedaCobro.equals(monedaBase)) {
            movimiento.setMonto(montoBase);
            movimiento.setMoneda(monedaBase);
        } else {
            BigDecimal montoEnMonedaCobro = convertirMoneda(tenantId, montoBase, monedaBase, monedaCobro);
            if (montoRecibido == null || montoRecibido.compareTo(montoEnMonedaCobro) < 0) {
                throw new RuntimeException("El monto recibido (" + montoRecibido + " " + monedaCobro
                    + ") no alcanza para cubrir " + montoEnMonedaCobro + " " + monedaCobro
                    + " (equivalente a " + montoBase + " " + monedaBase + ")");
            }
            movimiento.setMonto(montoEnMonedaCobro);
            movimiento.setMoneda(monedaCobro);
            movimiento.setMontoEquivalenteBase(montoBase);
            movimiento.setMonedaBaseEquivalente(monedaBase);
            movimiento.setTasaAplicada(montoEnMonedaCobro.divide(montoBase, 6, RoundingMode.HALF_UP));
        }

        return movimientoCajaRepository.save(movimiento);
    }

    /**
     * Registra un movimiento DIRECTAMENTE en la moneda indicada (no en la
     * moneda base) — para casos como la nómina de destajo, donde cada rol
     * puede pactarse en una moneda distinta (ej. picador a $/tonelada,
     * carretero a COP/tonelada): el egreso real de CADA rol debe quedar en SU
     * propia moneda, no forzado ni mezclado con la base del negocio. El
     * equivalente en moneda base es solo de referencia para reportes — si no
     * hay tasa registrada entre esa moneda y la base, se omite sin hacer
     * fallar el registro (a diferencia de registrarMovimientoMultiMoneda, acá
     * no hay "monto recibido" que validar: es un pago directo, no un cobro).
     */
    @Transactional
    public MovimientoCaja registrarMovimientoEnMoneda(Long tenantId, MovimientoCaja.TipoMovimiento tipo, BigDecimal monto,
                                                         String moneda, String concepto) {
        String monedaBase = obtenerMonedaBase(tenantId);

        MovimientoCaja movimiento = new MovimientoCaja();
        movimiento.setTenantId(tenantId);
        movimiento.setTipo(tipo);
        movimiento.setMonto(monto);
        movimiento.setMoneda(moneda);
        movimiento.setConcepto(concepto);

        if (!moneda.equals(monedaBase)) {
            try {
                BigDecimal equivalente = convertirMoneda(tenantId, monto, moneda, monedaBase);
                movimiento.setMontoEquivalenteBase(equivalente);
                movimiento.setMonedaBaseEquivalente(monedaBase);
                movimiento.setTasaAplicada(equivalente.divide(monto, 6, RoundingMode.HALF_UP));
            } catch (RuntimeException sinTasa) {
                // Sin tasa registrada entre esta moneda y la base: el movimiento igual
                // se registra en su moneda real, solo se omite el equivalente informativo.
            }
        }

        return movimientoCajaRepository.save(movimiento);
    }
}
