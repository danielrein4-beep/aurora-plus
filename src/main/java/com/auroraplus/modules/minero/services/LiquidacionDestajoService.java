package com.auroraplus.modules.minero.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.modules.minero.entities.DetalleLiquidacionDestajo;
import com.auroraplus.modules.minero.entities.LiquidacionDestajo;
import com.auroraplus.modules.minero.entities.TipoTrabajoMinero;
import com.auroraplus.modules.minero.repositories.LiquidacionDestajoRepository;
import com.auroraplus.modules.minero.repositories.TipoTrabajoMineroRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Liquidación de destajo de una cuadrilla/pareja sobre una misma producción,
 * en dos modalidades:
 * - POR ROL: cada trabajador tiene su propio TipoTrabajoMinero (tarifa y
 *   moneda propias) — útil cuando los roles cobran tarifas muy distintas.
 * - TARIFA ÚNICA DE PAREJA: la cuadrilla entera negoció una sola tarifa por
 *   unidad de producción, repartida entre sus integrantes por porcentaje —
 *   el caso más frecuente según el usuario ("casi siempre trabajan en
 *   conjunto... una tarifa única que se cuadra con ellos").
 * En ambos casos, el egreso real en caja se registra POR CADA MONEDA
 * involucrada (nunca mezclado), y solo al liquidar — antes de eso no hay
 * ningún movimiento de tesorería.
 */
@Service
public class LiquidacionDestajoService {

    @Autowired
    private LiquidacionDestajoRepository liquidacionDestajoRepository;

    @Autowired
    private TipoTrabajoMineroRepository tipoTrabajoMineroRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    public static class ItemTrabajador {
        public String nombreTrabajador;
        public Long tipoTrabajoId; // modalidad POR ROL — obligatorio si tarifaConjunta es null
        public String rolLibre; // modalidad TARIFA ÚNICA — solo etiqueta, opcional
        public BigDecimal porcentajeParticipacion; // opcional, por defecto 100
    }

    @Transactional
    public LiquidacionDestajo registrarLiquidacion(Long tenantId, String frenteCorte, LocalDate fecha,
                                                     BigDecimal produccionTotal, List<ItemTrabajador> trabajadores) {
        return registrarLiquidacion(tenantId, frenteCorte, fecha, produccionTotal, null, null, trabajadores);
    }

    @Transactional
    public LiquidacionDestajo registrarLiquidacion(Long tenantId, String frenteCorte, LocalDate fecha, BigDecimal produccionTotal,
                                                     BigDecimal tarifaConjunta, String monedaConjunta, List<ItemTrabajador> trabajadores) {
        if (produccionTotal == null || produccionTotal.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("La producción total debe ser mayor a cero");
        }
        if (trabajadores == null || trabajadores.isEmpty()) {
            throw new RuntimeException("La liquidación debe tener al menos un trabajador");
        }

        boolean esTarifaUnica = tarifaConjunta != null;
        if (esTarifaUnica) {
            if (tarifaConjunta.compareTo(BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("La tarifa conjunta debe ser mayor a cero");
            }
            if (monedaConjunta == null || monedaConjunta.isBlank()) {
                throw new RuntimeException("Debe indicar monedaConjunta cuando se usa tarifaConjunta");
            }
            BigDecimal sumaPorcentajes = trabajadores.stream()
                .map(t -> t.porcentajeParticipacion != null ? t.porcentajeParticipacion : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (sumaPorcentajes.compareTo(new BigDecimal("100")) != 0) {
                throw new RuntimeException("En modalidad de tarifa única, los porcentajes de participación deben sumar exactamente 100 (suman " + sumaPorcentajes + ")");
            }
        }

        LiquidacionDestajo liquidacion = new LiquidacionDestajo();
        liquidacion.setTenantId(tenantId);
        liquidacion.setFrenteCorte(frenteCorte);
        liquidacion.setFecha(fecha != null ? fecha : LocalDate.now());
        liquidacion.setProduccionTotal(produccionTotal);
        liquidacion.setTarifaConjunta(tarifaConjunta);
        liquidacion.setMonedaConjunta(monedaConjunta);

        BigDecimal montoTotalConjunto = esTarifaUnica
            ? produccionTotal.multiply(tarifaConjunta).setScale(2, RoundingMode.HALF_UP)
            : null;

        // Egresos reales por moneda: si un trabajador cobra en USD y otro en COP,
        // son movimientos de caja distintos, no uno mezclado.
        Map<String, BigDecimal> totalPorMoneda = new LinkedHashMap<>();
        String monedaBase = motorFinancieroService.obtenerMonedaBase(tenantId);
        BigDecimal totalEquivalenteBase = BigDecimal.ZERO;

        for (ItemTrabajador item : trabajadores) {
            if (item.nombreTrabajador == null || item.nombreTrabajador.isBlank()) {
                throw new RuntimeException("El nombre del trabajador es obligatorio");
            }

            BigDecimal porcentaje = item.porcentajeParticipacion != null ? item.porcentajeParticipacion : new BigDecimal("100");
            if (porcentaje.compareTo(BigDecimal.ZERO) <= 0 || porcentaje.compareTo(new BigDecimal("100")) > 0) {
                throw new RuntimeException("El porcentaje de participación debe estar entre 0 y 100");
            }

            DetalleLiquidacionDestajo detalle = new DetalleLiquidacionDestajo();
            detalle.setTenantId(tenantId);
            detalle.setNombreTrabajador(item.nombreTrabajador);
            detalle.setPorcentajeParticipacion(porcentaje);

            BigDecimal montoPagado;
            String moneda;

            if (esTarifaUnica) {
                // Todos reparten el MISMO monto total conjunto por su porcentaje —
                // no cada uno el 100% de su propia tarifa (esa es la modalidad POR ROL).
                montoPagado = montoTotalConjunto.multiply(porcentaje).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                moneda = monedaConjunta;
                detalle.setRolLibre(item.rolLibre);
                detalle.setCantidadAsignada(produccionTotal.multiply(porcentaje).divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
                detalle.setTarifaAplicada(tarifaConjunta);
            } else {
                if (item.tipoTrabajoId == null) {
                    throw new RuntimeException("Debe indicar tipoTrabajoId para " + item.nombreTrabajador + " (o usar tarifaConjunta para pagar en pareja)");
                }
                TipoTrabajoMinero tipoTrabajo = tipoTrabajoMineroRepository.findById(item.tipoTrabajoId)
                    .orElseThrow(() -> new RuntimeException("Tipo de trabajo no encontrado: " + item.tipoTrabajoId));
                if (!tipoTrabajo.getTenantId().equals(tenantId)) {
                    throw new RuntimeException("Violación de seguridad: Tipo de trabajo no pertenece a este tenant");
                }

                BigDecimal cantidadAsignada = produccionTotal.multiply(porcentaje).divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
                montoPagado = cantidadAsignada.multiply(tipoTrabajo.getTarifaPorUnidad()).setScale(2, RoundingMode.HALF_UP);
                moneda = tipoTrabajo.getMoneda();

                detalle.setTipoTrabajo(tipoTrabajo);
                detalle.setCantidadAsignada(cantidadAsignada);
                detalle.setTarifaAplicada(tipoTrabajo.getTarifaPorUnidad());
            }

            detalle.setMontoPagado(montoPagado);
            detalle.setMoneda(moneda);
            liquidacion.addDetalle(detalle);

            totalPorMoneda.merge(moneda, montoPagado, BigDecimal::add);

            // Total en moneda base es informativo — si falta la tasa, ese trabajador
            // queda fuera del total de referencia sin hacer fallar el registro (el
            // pago real, en su propia moneda, se hace igual).
            try {
                totalEquivalenteBase = totalEquivalenteBase.add(
                    motorFinancieroService.convertirMoneda(tenantId, montoPagado, moneda, monedaBase));
            } catch (RuntimeException sinTasa) {
                // sin tasa registrada — total en base queda subestimado a propósito.
            }
        }

        liquidacion.setTotal(totalEquivalenteBase);
        LiquidacionDestajo guardada = liquidacionDestajoRepository.save(liquidacion);

        String frenteTexto = frenteCorte != null ? " — Frente: " + frenteCorte : "";
        for (Map.Entry<String, BigDecimal> entry : totalPorMoneda.entrySet()) {
            motorFinancieroService.registrarMovimientoEnMoneda(tenantId, MovimientoCaja.TipoMovimiento.EGRESO,
                entry.getValue(), entry.getKey(), "Liquidación de destajo" + frenteTexto + " (" + entry.getKey() + ")");
        }

        return guardada;
    }
}
