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
 * Consolida las ventas reales del kardex especializado de Repuestos. El movimiento
 * todavía no congela el costo unitario histórico; por eso reporta ventas, pero deja
 * costo y cobertura en cero en vez de usar el costo actual del catálogo.
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

        BigDecimal ventasBrutas = movimientoRepuestoRepository
            .findByTenantIdAndTipoAndFechaRegistroGreaterThanEqualAndFechaRegistroLessThan(
                tenantId, MovimientoRepuesto.TipoMovimiento.VENTA, desdeInicio, hastaFin)
            .stream()
            .map(MovimientoRepuesto::getTotal)
            .filter(java.util.Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);

        return new ResumenVentasCostos(
            ventasBrutas,
            BigDecimal.ZERO.setScale(2),
            BigDecimal.ZERO.setScale(2),
            BigDecimal.ZERO.setScale(2),
            motorFinancieroService.obtenerMonedaBase(tenantId)
        );
    }
}
