package com.auroraplus.modules.tamanacocomercial.dto;

import java.math.BigDecimal;
import java.util.List;

public class NominaPagoRequestDTO {
    private String mina;
    private BigDecimal monto;
    private String moneda;
    private String metodoPago;
    private String fecha;
    private String semanaInicio;
    private String semanaFin;
    private String notas;
    private List<Long> prestamosIds;

    public String getMina() { return mina; }
    public void setMina(String mina) { this.mina = mina; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }
    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }
    public String getFecha() { return fecha; }
    public void setFecha(String fecha) { this.fecha = fecha; }
    public String getSemanaInicio() { return semanaInicio; }
    public void setSemanaInicio(String semanaInicio) { this.semanaInicio = semanaInicio; }
    public String getSemanaFin() { return semanaFin; }
    public void setSemanaFin(String semanaFin) { this.semanaFin = semanaFin; }
    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
    public List<Long> getPrestamosIds() { return prestamosIds; }
    public void setPrestamosIds(List<Long> prestamosIds) { this.prestamosIds = prestamosIds; }
}
