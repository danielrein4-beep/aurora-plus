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
import java.time.LocalDate;
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
        validarMoneda(monedaOrigen);
        validarMoneda(monedaDestino);
        if (tasa == null || tasa.signum() <= 0) throw new IllegalArgumentException("La tasa debe ser mayor a cero");
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
        return convertirConPrecision(tenantId, monto, monedaOrigen, monedaDestino, 2);
    }

    /** Costos por kg/g/ml conservan cuatro decimales; el cobro se redondea al final. */
    public BigDecimal convertirCostoAMonedaBase(Long tenantId, BigDecimal monto, String monedaOrigen) {
        return convertirConPrecision(tenantId, monto, monedaOrigen, obtenerMonedaBase(tenantId), 4);
    }

    private static void validarMoneda(String moneda) {
        if (!java.util.Set.of("USD", "VES", "COP").contains(moneda == null ? "" : moneda))
            throw new IllegalArgumentException("Seleccione USD, VES o COP");
    }

    private BigDecimal convertirConPrecision(Long tenantId, BigDecimal monto, String monedaOrigen, String monedaDestino, int escala) {
        validarMoneda(monedaOrigen);
        validarMoneda(monedaDestino);
        if (monto == null) throw new IllegalArgumentException("Indique el monto");
        if (monedaOrigen.equals(monedaDestino)) return monto.setScale(escala, RoundingMode.HALF_UP);

        BigDecimal conversionDirecta = convertirConTasaDisponible(tenantId, monto, monedaOrigen, monedaDestino, escala);
        if (conversionDirecta != null) return conversionDirecta;

        // En Venezuela es normal registrar USD→VES y USD→COP, pero no una
        // tasa artificial VES→COP. Para una compra en bolívares de un negocio
        // cuya moneda base sea COP (o al revés), usamos USD como puente. El
        // resultado se calcula en la operación y queda congelado al guardarse;
        // nunca se vuelve a convertir con la tasa de otro día.
        if (!"USD".equals(monedaOrigen) && !"USD".equals(monedaDestino)) {
            BigDecimal montoEnUsd = convertirConTasaDisponible(tenantId, monto, monedaOrigen, "USD", 6);
            if (montoEnUsd != null) {
                BigDecimal resultado = convertirConTasaDisponible(tenantId, montoEnUsd, "USD", monedaDestino, escala);
                if (resultado != null) return resultado;
            }
        }

        throw new RuntimeException("No hay tasa de cambio registrada entre " + monedaOrigen + " y " + monedaDestino
            + ". Registre la tasa en Configuración → Tasas de cambio.");
    }

    /** Factor de alta precisión para que el POS use exactamente la misma conversión. */
    public BigDecimal factorConversion(Long tenantId, String origen, String destino) {
        return convertirConPrecision(tenantId, BigDecimal.ONE, origen, destino, 12);
    }

    /** Devuelve null únicamente cuando no existe una tasa directa ni inversa. */
    private BigDecimal convertirConTasaDisponible(Long tenantId, BigDecimal monto, String monedaOrigen,
                                                   String monedaDestino, int escala) {
        if (("USD".equals(monedaOrigen) && "VES".equals(monedaDestino))
                || ("VES".equals(monedaOrigen) && "USD".equals(monedaDestino))) {
            var licencia = licenciaTenantRepository.findByTenantId(tenantId);
            if (licencia.isPresent()) {
                var seleccionada = tasaCambioRepository.findTopByTenantIdAndMonedaOrigenAndMonedaDestinoAndOrigenApiOrderByFechaActualizacionDesc(
                    tenantId, "USD", "VES", licencia.get().getOrigenTasaActiva());
                if (seleccionada.isPresent() && seleccionada.get().getTasa().signum() > 0) {
                    return "USD".equals(monedaOrigen)
                        ? monto.multiply(seleccionada.get().getTasa()).setScale(escala, RoundingMode.HALF_UP)
                        : monto.divide(seleccionada.get().getTasa(), escala, RoundingMode.HALF_UP);
                }
            }
        }
        var directa = tasaCambioRepository
            .findTopByTenantIdAndMonedaOrigenAndMonedaDestinoOrderByFechaActualizacionDesc(tenantId, monedaOrigen, monedaDestino);
        if (directa.isPresent()) {
            return monto.multiply(directa.get().getTasa()).setScale(escala, RoundingMode.HALF_UP);
        }

        var inversa = tasaCambioRepository
            .findTopByTenantIdAndMonedaOrigenAndMonedaDestinoOrderByFechaActualizacionDesc(tenantId, monedaDestino, monedaOrigen);
        if (inversa.isPresent()) {
            return monto.divide(inversa.get().getTasa(), escala, RoundingMode.HALF_UP);
        }
        return null;
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

    @Transactional
    public MovimientoCaja registrarCompraConEquivalencia(Long tenantId, BigDecimal monto, String moneda,
                                                          BigDecimal equivalente, String concepto, Long articuloId) {
        validarMoneda(moneda);
        if (monto == null || monto.signum() <= 0 || equivalente == null || equivalente.signum() < 0)
            throw new IllegalArgumentException("Importe de compra inválido");
        MovimientoCaja m = new MovimientoCaja();
        m.setTenantId(tenantId);
        m.setTipo(MovimientoCaja.TipoMovimiento.EGRESO);
        m.setMonto(monto);
        m.setMoneda(moneda);
        m.setMontoEquivalenteBase(equivalente.setScale(2, RoundingMode.HALF_UP));
        m.setMonedaBaseEquivalente(obtenerMonedaBase(tenantId));
        m.setTasaAplicada(equivalente.divide(monto, 10, RoundingMode.HALF_UP));
        m.setConcepto(concepto);
        m.setModuloOrigen("INVENTARIO");
        m.setReferenciaTipo("Articulo");
        m.setReferenciaId(articuloId);
        return movimientoCajaRepository.save(m);
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
        return registrarMovimientoMultiMoneda(tenantId, tipo, montoBase, monedaPago, montoRecibido, concepto, null, null, null);
    }

    /**
     * Igual que el overload de arriba, pero con trazabilidad de origen (docs/finance-contract.md,
     * Capa 1): qué vertical y qué venta/compra/gasto generó este movimiento. moduloOrigen/
     * referenciaTipo/referenciaId son opcionales (null = "MANUAL" para efectos de reportes,
     * ver EmpresaKpiService) — este overload existe para que los call-sites que SÍ quieran
     * etiquetar su movimiento lo hagan sin forzar a los demás a cambiar su firma.
     */
    @Transactional
    public MovimientoCaja registrarMovimientoMultiMoneda(Long tenantId, MovimientoCaja.TipoMovimiento tipo, BigDecimal montoBase,
                                                            String monedaPago, BigDecimal montoRecibido, String concepto,
                                                            String moduloOrigen, String referenciaTipo, Long referenciaId) {
        return registrarMovimientoMultiMoneda(tenantId, tipo, montoBase, monedaPago, montoRecibido, concepto,
            moduloOrigen, referenciaTipo, referenciaId, null);
    }

    /** Igual que el overload base, pero con `fechaVencimiento` (ver el overload completo más abajo) y sin trazabilidad de origen. */
    @Transactional
    public MovimientoCaja registrarMovimientoMultiMoneda(Long tenantId, MovimientoCaja.TipoMovimiento tipo, BigDecimal montoBase,
                                                            String monedaPago, BigDecimal montoRecibido, String concepto,
                                                            LocalDate fechaVencimiento) {
        return registrarMovimientoMultiMoneda(tenantId, tipo, montoBase, monedaPago, montoRecibido, concepto, null, null, null, fechaVencimiento);
    }

    /**
     * Igual que el overload de arriba, con `fechaVencimiento` — el plazo de crédito
     * pactado con el proveedor/cliente (ej. "5 días de crédito" en la factura).
     * Solo tiene efecto en CXC/CXP; se ignora en INGRESO/EGRESO.
     */
    @Transactional
    public MovimientoCaja registrarMovimientoMultiMoneda(Long tenantId, MovimientoCaja.TipoMovimiento tipo, BigDecimal montoBase,
                                                            String monedaPago, BigDecimal montoRecibido, String concepto,
                                                            String moduloOrigen, String referenciaTipo, Long referenciaId,
                                                            LocalDate fechaVencimiento) {
        String monedaBase = obtenerMonedaBase(tenantId);
        String monedaCobro = (monedaPago != null && !monedaPago.isBlank()) ? monedaPago : monedaBase;

        MovimientoCaja movimiento = new MovimientoCaja();
        movimiento.setTenantId(tenantId);
        movimiento.setTipo(tipo);
        movimiento.setConcepto(concepto);
        movimiento.setModuloOrigen(moduloOrigen);
        movimiento.setReferenciaTipo(referenciaTipo);
        movimiento.setReferenciaId(referenciaId);

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

        if (tipo == MovimientoCaja.TipoMovimiento.CXC || tipo == MovimientoCaja.TipoMovimiento.CXP) {
            movimiento.setSaldoPendiente(movimiento.getMonto());
            movimiento.setEstado("PENDIENTE");
            movimiento.setFechaVencimiento(fechaVencimiento);
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
        return registrarMovimientoEnMoneda(tenantId, tipo, monto, moneda, concepto, null, null, null);
    }

    /** Igual que el overload de arriba, con trazabilidad de origen — ver el equivalente en registrarMovimientoMultiMoneda. */
    @Transactional
    public MovimientoCaja registrarMovimientoEnMoneda(Long tenantId, MovimientoCaja.TipoMovimiento tipo, BigDecimal monto,
                                                         String moneda, String concepto,
                                                         String moduloOrigen, String referenciaTipo, Long referenciaId) {
        String monedaBase = obtenerMonedaBase(tenantId);

        MovimientoCaja movimiento = new MovimientoCaja();
        movimiento.setTenantId(tenantId);
        movimiento.setTipo(tipo);
        movimiento.setMonto(monto);
        movimiento.setMoneda(moneda);
        movimiento.setConcepto(concepto);
        movimiento.setModuloOrigen(moduloOrigen);
        movimiento.setReferenciaTipo(referenciaTipo);
        movimiento.setReferenciaId(referenciaId);

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

        if (tipo == MovimientoCaja.TipoMovimiento.CXC || tipo == MovimientoCaja.TipoMovimiento.CXP) {
            movimiento.setSaldoPendiente(movimiento.getMonto());
            movimiento.setEstado("PENDIENTE");
        }

        return movimientoCajaRepository.save(movimiento);
    }

    /**
     * Registra un abono (pago parcial o total) sobre una cuenta por pagar o
     * por cobrar existente: sin esto, una CXP/CXC nacía y se quedaba en la
     * lista para siempre — no había forma de anotar que ya se le pagó al
     * proveedor, o que el cliente ya saldó su deuda. El abono además genera
     * su propio movimiento real de caja (EGRESO si es CXP — plata que sale a
     * pagarle al proveedor; INGRESO si es CXC — plata que entra del cliente),
     * en la moneda en que efectivamente se entregó/recibió, para que el
     * arqueo de caja del día lo vea igual que cualquier otro movimiento.
     */
    @Transactional
    public MovimientoCaja abonarMovimiento(Long tenantId, Long movimientoId, BigDecimal montoAbono, String monedaAbono) {
        MovimientoCaja cuenta = movimientoCajaRepository.findById(movimientoId)
            .orElseThrow(() -> new RuntimeException("Movimiento no encontrado"));
        if (!cuenta.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: movimiento no pertenece a este tenant");
        }
        if (cuenta.getTipo() != MovimientoCaja.TipoMovimiento.CXC && cuenta.getTipo() != MovimientoCaja.TipoMovimiento.CXP) {
            throw new RuntimeException("Solo se puede abonar a una cuenta por cobrar o por pagar");
        }
        if ("PAGADO".equals(cuenta.getEstado())) {
            throw new RuntimeException("Esta cuenta ya está saldada");
        }
        if (montoAbono == null || montoAbono.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("El monto del abono debe ser mayor a cero");
        }

        BigDecimal saldoActual = cuenta.getSaldoPendiente() != null ? cuenta.getSaldoPendiente() : cuenta.getMonto();
        String monedaCuenta = cuenta.getMoneda();
        String monedaEfectiva = (monedaAbono != null && !monedaAbono.isBlank()) ? monedaAbono : monedaCuenta;
        BigDecimal montoAbonoEnMonedaCuenta = monedaEfectiva.equals(monedaCuenta)
            ? montoAbono
            : convertirMoneda(tenantId, montoAbono, monedaEfectiva, monedaCuenta);

        BigDecimal nuevoSaldo = saldoActual.subtract(montoAbonoEnMonedaCuenta).setScale(2, RoundingMode.HALF_UP);
        if (nuevoSaldo.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("El abono (" + montoAbonoEnMonedaCuenta + " " + monedaCuenta
                + ") es mayor al saldo pendiente (" + saldoActual + " " + monedaCuenta + ")");
        }
        cuenta.setSaldoPendiente(nuevoSaldo);
        if (nuevoSaldo.compareTo(new BigDecimal("0.01")) < 0) {
            cuenta.setEstado("PAGADO");
        }
        movimientoCajaRepository.save(cuenta);

        MovimientoCaja.TipoMovimiento tipoAbono = cuenta.getTipo() == MovimientoCaja.TipoMovimiento.CXP
            ? MovimientoCaja.TipoMovimiento.EGRESO : MovimientoCaja.TipoMovimiento.INGRESO;
        return registrarMovimientoEnMoneda(tenantId, tipoAbono, montoAbono, monedaEfectiva,
            "Abono a: " + cuenta.getConcepto());
    }
}
