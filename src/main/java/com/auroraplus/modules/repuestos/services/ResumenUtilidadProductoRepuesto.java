package com.auroraplus.modules.repuestos.services;

import java.math.BigDecimal;

/**
 * Utilidad real de UN producto en un período, calculada solo sobre ventas cuyo costo
 * quedó congelado al momento de venderse (ver MovimientoRepuesto.costoUnitario) — nunca
 * sobre el costo actual del catálogo, que pudo cambiar desde entonces. Si una parte de
 * las ventas de este producto no tiene costo conocido, "margenPct" queda en null en vez
 * de inventar un número — se ve reflejado en "ventasConCostoConocido" vs "ventasBrutas".
 */
public class ResumenUtilidadProductoRepuesto {
    public Long repuestoId;
    public String codigoSku;
    public String descripcion;
    public BigDecimal cantidadVendida = BigDecimal.ZERO;
    public BigDecimal ventasBrutas = BigDecimal.ZERO;
    public BigDecimal ventasConCostoConocido = BigDecimal.ZERO;
    public BigDecimal costoVentas = BigDecimal.ZERO;
    public BigDecimal utilidad = BigDecimal.ZERO;
    public BigDecimal margenPct;
}
