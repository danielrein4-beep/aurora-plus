package com.auroraplus.core.costeo.impl;

import com.auroraplus.core.costeo.CosteoProvider;
import com.auroraplus.core.costeo.ResumenVentasCostos;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.entities.ItemComanda;
import com.auroraplus.modules.horeca.repositories.ItemComandaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * docs/finance-contract.md §3 — costo real ya congelado por EscandalloService al vender
 * (ItemComanda.costoUnitario). Los ítems sin escandallo (cargos manuales, ej. "Cover") tienen
 * costoUnitario null: cuentan en ventasBrutas pero no en ventasConCostoConocido, así que la
 * cobertura de Horeca normalmente NO es 100% — eso es correcto, no un bug de este proveedor.
 */
@Component
public class HorecaCosteoProvider implements CosteoProvider {

    @Autowired
    private ItemComandaRepository itemComandaRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    @Override
    public String moduloId() {
        return "HORECA";
    }

    @Override
    public ResumenVentasCostos resumenPeriodo(Long tenantId, LocalDate desde, LocalDate hasta) {
        LocalDateTime desdeInicio = desde.atStartOfDay();
        LocalDateTime hastaFin = hasta.plusDays(1).atStartOfDay();

        List<ItemComanda> items = itemComandaRepository.findByTenantIdAndComanda_EstadoAndComanda_FechaCierreBetween(
            tenantId, Comanda.EstadoComanda.PAGADA, desdeInicio, hastaFin);

        BigDecimal ventasBrutas = BigDecimal.ZERO;
        BigDecimal costoVentas = BigDecimal.ZERO;
        BigDecimal ventasConCostoConocido = BigDecimal.ZERO;

        for (ItemComanda item : items) {
            BigDecimal totalLinea = item.getPrecioUnitario().multiply(item.getCantidad());
            ventasBrutas = ventasBrutas.add(totalLinea);
            if (item.getCostoUnitario() != null) {
                costoVentas = costoVentas.add(item.getCostoUnitario().multiply(item.getCantidad()));
                ventasConCostoConocido = ventasConCostoConocido.add(totalLinea);
            }
        }

        String moneda = motorFinancieroService.obtenerMonedaBase(tenantId);
        return new ResumenVentasCostos(
            ventasBrutas.setScale(2, RoundingMode.HALF_UP),
            costoVentas.setScale(2, RoundingMode.HALF_UP),
            BigDecimal.ZERO,
            ventasConCostoConocido.setScale(2, RoundingMode.HALF_UP),
            moneda
        );
    }
}
