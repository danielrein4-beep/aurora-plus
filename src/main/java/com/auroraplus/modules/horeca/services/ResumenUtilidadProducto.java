package com.auroraplus.modules.horeca.services;

import java.math.BigDecimal;

/** Una fila del reporte de utilidad diaria por producto (ver HorecaService.obtenerUtilidadDiaria). */
public class ResumenUtilidadProducto {
    public String nombrePlato;
    public BigDecimal cantidadVendida = BigDecimal.ZERO;
    public BigDecimal ingresoTotal = BigDecimal.ZERO;
    public BigDecimal costoTotal = BigDecimal.ZERO;
    public BigDecimal utilidad = BigDecimal.ZERO;

    public ResumenUtilidadProducto() {}
    public ResumenUtilidadProducto(String nombrePlato) { this.nombrePlato = nombrePlato; }
}
