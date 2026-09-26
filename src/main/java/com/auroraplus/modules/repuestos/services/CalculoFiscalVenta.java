package com.auroraplus.modules.repuestos.services;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Desglose fiscal de un ticket del POS (IVA, IGTF y delivery), sin tocar base de datos.
 * El POS del navegador repite esta misma cuenta solo para mostrarla; la que vale es esta.
 *
 * - gravado: suma de las líneas de productos NO exentos, al precio de venta del catálogo.
 * - exento: suma de las líneas de productos exentos de IVA.
 * - delivery: cargo de envío; se trata como un servicio gravado más.
 * - preciosIncluyenIva: el precio del catálogo ya trae el IVA adentro (se desglosa) o se suma encima.
 * - aplicaIva: false cuando el negocio no cobra IVA o el cajero lo quitó en esta venta. Con precios
 *   que incluyen IVA, quitarlo cobra solo la base (el cliente no paga el impuesto).
 * - IGTF: porcentaje sobre la parte pagada en divisas (cualquier moneda distinta del bolívar),
 *   nunca mayor que el subtotal de la venta.
 */
public final class CalculoFiscalVenta {

    private static final BigDecimal CIEN = new BigDecimal("100");

    public record Desglose(BigDecimal exento, BigDecimal baseImponible, BigDecimal alicuotaIva, BigDecimal iva,
                           BigDecimal delivery, BigDecimal subtotal, BigDecimal igtf, BigDecimal total) {}

    private CalculoFiscalVenta() {}

    public static Desglose calcular(BigDecimal gravado, BigDecimal exento, BigDecimal delivery,
                                    boolean aplicaIva, BigDecimal alicuotaIva, boolean preciosIncluyenIva,
                                    boolean aplicaIgtf, BigDecimal alicuotaIgtf, BigDecimal pagadoEnDivisas) {
        BigDecimal g = nz(gravado).add(nz(delivery));
        BigDecimal ex = nz(exento).setScale(2, RoundingMode.HALF_UP);
        BigDecimal factor = BigDecimal.ONE.add(nz(alicuotaIva).divide(CIEN, 6, RoundingMode.HALF_UP));

        BigDecimal base;
        BigDecimal iva;
        if (preciosIncluyenIva) {
            base = g.divide(factor, 2, RoundingMode.HALF_UP);
            iva = aplicaIva ? g.setScale(2, RoundingMode.HALF_UP).subtract(base) : BigDecimal.ZERO.setScale(2);
        } else {
            base = g.setScale(2, RoundingMode.HALF_UP);
            iva = aplicaIva ? base.multiply(factor.subtract(BigDecimal.ONE)).setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2);
        }
        BigDecimal subtotal = ex.add(base).add(iva);

        BigDecimal igtf = BigDecimal.ZERO.setScale(2);
        if (aplicaIgtf && pagadoEnDivisas != null && pagadoEnDivisas.signum() > 0) {
            igtf = pagadoEnDivisas.min(subtotal).multiply(nz(alicuotaIgtf)).divide(CIEN, 2, RoundingMode.HALF_UP);
        }
        return new Desglose(ex, base, aplicaIva ? nz(alicuotaIva) : BigDecimal.ZERO, iva,
            nz(delivery).setScale(2, RoundingMode.HALF_UP), subtotal, igtf, subtotal.add(igtf));
    }

    /** El IGTF grava los pagos en divisas: todo lo que no sea bolívar. */
    public static boolean esDivisa(String moneda) {
        return moneda != null && !moneda.isBlank() && !"VES".equalsIgnoreCase(moneda.trim());
    }

    private static BigDecimal nz(BigDecimal v) { return v != null ? v : BigDecimal.ZERO; }
}
