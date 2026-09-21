package com.auroraplus.core.costeo.impl;

import com.auroraplus.core.costeo.CosteoProvider;
import com.auroraplus.core.costeo.ResumenVentasCostos;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.modules.repuestos.entities.MovimientoRepuesto;
import com.auroraplus.modules.repuestos.repositories.MovimientoRepuestoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Consolida las ventas reales del kardex especializado de Repuestos. Desde V56, cada
 * venta congela el costo unitario del repuesto en ese momento (movimiento.costoUnitario);
 * las ventas sin ese dato (históricas previas a V56, o repuestos sin ninguna compra
 * registrada todavía) se cuentan en ventasBrutas pero quedan fuera de
 * ventasConCostoConocido, para que la cobertura refleje qué tan confiable es el margen.
 */
@Component
public class RepuestosCosteoProvider implements CosteoProvider {

    @Autowired
    private MovimientoRepuestoRepository movimientoRepuestoRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    @Override
    public String moduloId() {
        return "REPUESTOS";
    }

    @Override
    public ResumenVentasCostos resumenPeriodo(Long tenantId, LocalDate desde, LocalDate hasta) {
        LocalDateTime desdeInicio = desde.atStartOfDay();
        LocalDateTime hastaFin = hasta.plusDays(1).atStartOfDay();

        var ventas = movimientoRepuestoRepository
            .findByTenantIdAndTipoAndFechaRegistroGreaterThanEqualAndFechaRegistroLessThan(
                tenantId, MovimientoRepuesto.TipoMovimiento.VENTA, desdeInicio, hastaFin);

        BigDecimal ventasBrutas = BigDecimal.ZERO;
        BigDecimal costoVentas = BigDecimal.ZERO;
        BigDecimal ventasConCostoConocido = BigDecimal.ZERO;

        for (MovimientoRepuesto m : ventas) {
            BigDecimal total = m.getTotal();
            if (total == null) continue;
            ventasBrutas = ventasBrutas.add(total);

            if (m.getCostoUnitario() != null && m.getCantidad() != null) {
                costoVentas = costoVentas.add(m.getCostoUnitario().multiply(m.getCantidad()));
                ventasConCostoConocido = ventasConCostoConocido.add(total);
            }
        }

        return new ResumenVentasCostos(
            ventasBrutas.setScale(2, RoundingMode.HALF_UP),
            costoVentas.setScale(2, RoundingMode.HALF_UP),
            BigDecimal.ZERO.setScale(2),
            ventasConCostoConocido.setScale(2, RoundingMode.HALF_UP),
            motorFinancieroService.obtenerMonedaBase(tenantId)
        );
    }
}
