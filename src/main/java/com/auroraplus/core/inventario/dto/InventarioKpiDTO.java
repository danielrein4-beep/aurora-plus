package com.auroraplus.core.inventario.dto;

import java.math.BigDecimal;

/**
 * KPIs financieros de Inventario para un tenant puntual — respuesta agregada
 * de GET /api/inventario/kpis, pensada para un panel gerencial (no expone
 * artículos individuales, solo los cuatro totales que le importan al dueño).
 *
 * @param cajaHoy             Neto de caja de hoy (INGRESOS - EGRESOS), en la moneda base del tenant.
 * @param valorBodega         SUM(stockActual * costoUnitario) de todo el inventario — cuánto capital hay inmovilizado en stock.
 * @param gananciaProyectada  SUM((precioVenta - costoUnitario) * stockActual) — utilidad si se vendiera todo el stock actual al precio de lista.
 * @param alertasReposicion   Cantidad de artículos agotados o en/bajo su stock mínimo.
 */
public record InventarioKpiDTO(
    BigDecimal cajaHoy,
    BigDecimal valorBodega,
    BigDecimal gananciaProyectada,
    long alertasReposicion
) {
}
