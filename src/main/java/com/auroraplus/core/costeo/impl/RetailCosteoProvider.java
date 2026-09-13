package com.auroraplus.core.costeo.impl;

import com.auroraplus.core.costeo.CosteoProvider;
import com.auroraplus.core.costeo.ResumenVentasCostos;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.modules.retail.entities.ItemVentaRetail;
import com.auroraplus.modules.retail.repositories.ItemVentaRetailRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * docs/finance-contract.md §3 — costoUnitario es NOT NULL en items_venta_retail (siempre se
 * congela al vender, ver ItemVentaRetail), así que la cobertura de este proveedor es 100% por
 * diseño de esquema, a diferencia de Horeca.
 */
@Component
public class RetailCosteoProvider implements CosteoProvider {

    @Autowired
    private ItemVentaRetailRepository itemVentaRetailRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    @Override
    public String moduloId() {
        return "RETAIL";
    }

    @Override
    public ResumenVentasCostos resumenPeriodo(Long tenantId, LocalDate desde, LocalDate hasta) {
        LocalDateTime desdeInicio = desde.atStartOfDay();
        LocalDateTime hastaFin = hasta.plusDays(1).atStartOfDay();

        List<ItemVentaRetail> items = itemVentaRetailRepository.findByTenantIdAndVenta_FechaRegistroBetween(
            tenantId, desdeInicio, hastaFin);

        BigDecimal ventasBrutas = BigDecimal.ZERO;
        BigDecimal costoVentas = BigDecimal.ZERO;

        for (ItemVentaRetail item : items) {
            ventasBrutas = ventasBrutas.add(item.getPrecioUnitario().multiply(item.getCantidad()));
            costoVentas = costoVentas.add(item.getCostoUnitario().multiply(item.getCantidad()));
        }

        BigDecimal ventasBrutasRedondeadas = ventasBrutas.setScale(2, RoundingMode.HALF_UP);
        String moneda = motorFinancieroService.obtenerMonedaBase(tenantId);
        return new ResumenVentasCostos(
            ventasBrutasRedondeadas,
            costoVentas.setScale(2, RoundingMode.HALF_UP),
            BigDecimal.ZERO,
            ventasBrutasRedondeadas, // costo siempre conocido en Retail -> cobertura 100%
            moneda
        );
    }
}
