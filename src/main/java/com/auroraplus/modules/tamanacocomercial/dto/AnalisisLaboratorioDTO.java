package com.auroraplus.modules.tamanacocomercial.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class AnalisisLaboratorioDTO {
    private Long id;
    private String mina;
    private LocalDate fechaAnalisis;
    private String fechaMuestra;
    private String lote;
    private String loteOReferencia;
    private BigDecimal humedad;
    private BigDecimal ceniza;
    private BigDecimal azufre;
    private BigDecimal poderCalorifico;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getMina() { return mina; }
    public void setMina(String mina) { this.mina = mina; }
    public LocalDate getFechaAnalisis() { return fechaAnalisis; }
    public void setFechaAnalisis(LocalDate fechaAnalisis) { this.fechaAnalisis = fechaAnalisis; }
    public String getFechaMuestra() { return fechaMuestra; }
    public void setFechaMuestra(String fechaMuestra) { this.fechaMuestra = fechaMuestra; }
    public String getLote() { return lote; }
    public void setLote(String lote) { this.lote = lote; }
    public String getLoteOReferencia() { return loteOReferencia; }
    public void setLoteOReferencia(String loteOReferencia) { this.loteOReferencia = loteOReferencia; }
    public BigDecimal getHumedad() { return humedad; }
    public void setHumedad(BigDecimal humedad) { this.humedad = humedad; }
    public BigDecimal getCeniza() { return ceniza; }
    public void setCeniza(BigDecimal ceniza) { this.ceniza = ceniza; }
    public BigDecimal getAzufre() { return azufre; }
    public void setAzufre(BigDecimal azufre) { this.azufre = azufre; }
    public BigDecimal getPoderCalorifico() { return poderCalorifico; }
    public void setPoderCalorifico(BigDecimal poderCalorifico) { this.poderCalorifico = poderCalorifico; }
}
