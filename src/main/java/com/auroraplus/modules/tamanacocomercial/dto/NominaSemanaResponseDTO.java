package com.auroraplus.modules.tamanacocomercial.dto;

import java.math.BigDecimal;
import java.util.List;

public class NominaSemanaResponseDTO {
    private String semanaInicio;
    private String semanaFin;
    private int totalDespachos;
    private List<NominaItemDTO> items;
    private BigDecimal totalGeneralCop;
    private BigDecimal totalPrestamosGeneralCop;
    private BigDecimal totalPagadoGeneralCop;
    private BigDecimal totalPendienteGeneralCop;

    public String getSemanaInicio() { return semanaInicio; }
    public void setSemanaInicio(String semanaInicio) { this.semanaInicio = semanaInicio; }
    public String getSemanaFin() { return semanaFin; }
    public void setSemanaFin(String semanaFin) { this.semanaFin = semanaFin; }
    public int getTotalDespachos() { return totalDespachos; }
    public void setTotalDespachos(int totalDespachos) { this.totalDespachos = totalDespachos; }
    public List<NominaItemDTO> getItems() { return items; }
    public void setItems(List<NominaItemDTO> items) { this.items = items; }
    public BigDecimal getTotalGeneralCop() { return totalGeneralCop; }
    public void setTotalGeneralCop(BigDecimal totalGeneralCop) { this.totalGeneralCop = totalGeneralCop; }
    public BigDecimal getTotalPrestamosGeneralCop() { return totalPrestamosGeneralCop; }
    public void setTotalPrestamosGeneralCop(BigDecimal totalPrestamosGeneralCop) { this.totalPrestamosGeneralCop = totalPrestamosGeneralCop; }
    public BigDecimal getTotalPagadoGeneralCop() { return totalPagadoGeneralCop; }
    public void setTotalPagadoGeneralCop(BigDecimal totalPagadoGeneralCop) { this.totalPagadoGeneralCop = totalPagadoGeneralCop; }
    public BigDecimal getTotalPendienteGeneralCop() { return totalPendienteGeneralCop; }
    public void setTotalPendienteGeneralCop(BigDecimal totalPendienteGeneralCop) { this.totalPendienteGeneralCop = totalPendienteGeneralCop; }
}
