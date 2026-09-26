package com.auroraplus.modules.repuestos.services;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CalculoFiscalVentaTest {

    private static BigDecimal bd(String v) { return new BigDecimal(v); }
    private static final BigDecimal IVA = bd("16");
    private static final BigDecimal IGTF = bd("3");

    @Test
    void negocioSinIvaNiIgtfCobraLoMismoQueAntes() {
        var d = CalculoFiscalVenta.calcular(bd("100"), bd("20"), null, false, BigDecimal.ZERO, false, false, BigDecimal.ZERO, null);
        assertEquals(bd("120.00"), d.total());
        assertEquals(bd("0.00"), d.iva());
    }

    @Test
    void precioConIvaIncluidoSeDesglosaSinCambiarElTotal() {
        var d = CalculoFiscalVenta.calcular(bd("116"), bd("10"), null, true, IVA, true, false, BigDecimal.ZERO, null);
        assertEquals(bd("100.00"), d.baseImponible());
        assertEquals(bd("16.00"), d.iva());
        assertEquals(bd("10.00"), d.exento());
        assertEquals(bd("126.00"), d.total());
    }

    @Test
    void ivaAparteSeSumaEncima() {
        var d = CalculoFiscalVenta.calcular(bd("100"), null, null, true, IVA, false, false, BigDecimal.ZERO, null);
        assertEquals(bd("116.00"), d.total());
    }

    @Test
    void ivaQuitadoConPrecioIncluidoCobraSoloLaBase() {
        var d = CalculoFiscalVenta.calcular(bd("116"), null, null, false, IVA, true, false, BigDecimal.ZERO, null);
        assertEquals(bd("100.00"), d.total());
        assertEquals(bd("0.00"), d.iva());
    }

    @Test
    void deliveryEsGravado() {
        var d = CalculoFiscalVenta.calcular(bd("100"), null, bd("5"), true, IVA, false, false, BigDecimal.ZERO, null);
        assertEquals(bd("105.00"), d.baseImponible());
        assertEquals(bd("121.80"), d.total());
    }

    @Test
    void igtfSoloSobreLoPagadoEnDivisasYNuncaMasQueElSubtotal() {
        var todo = CalculoFiscalVenta.calcular(bd("100"), null, null, false, BigDecimal.ZERO, false, true, IGTF, bd("999999"));
        assertEquals(bd("3.00"), todo.igtf());
        assertEquals(bd("103.00"), todo.total());
        var mitad = CalculoFiscalVenta.calcular(bd("100"), null, null, false, BigDecimal.ZERO, false, true, IGTF, bd("50"));
        assertEquals(bd("1.50"), mitad.igtf());
        var bolivares = CalculoFiscalVenta.calcular(bd("100"), null, null, false, BigDecimal.ZERO, false, true, IGTF, BigDecimal.ZERO);
        assertEquals(bd("0.00"), bolivares.igtf());
    }
}
