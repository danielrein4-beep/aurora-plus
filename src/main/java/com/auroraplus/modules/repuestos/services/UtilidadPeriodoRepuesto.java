package com.auroraplus.modules.repuestos.services;

import java.math.BigDecimal;
import java.util.List;

/**
 * Resumen de utilidad de Comercio (Repuestos/Ferretería/Retail) para un período —
 * distinto de "ventas": ventasBrutas es lo que entró en caja, utilidad es lo que
 * quedó después del costo real de cada línea vendida. Ver ResumenUtilidadProductoRepuesto
 * para el porqué de coberturaPct.
 */
public class UtilidadPeriodoRepuesto {
    public BigDecimal ventasBrutas = BigDecimal.ZERO;
    public BigDecimal costoVentas = BigDecimal.ZERO;
    public BigDecimal utilidad = BigDecimal.ZERO;
    public BigDecimal margenPct;
    public BigDecimal coberturaPct = BigDecimal.ZERO;
    public String moneda;
    public List<ResumenUtilidadProductoRepuesto> productos;
}
