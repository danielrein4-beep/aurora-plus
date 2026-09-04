package com.auroraplus.modules.tamanacocomercial.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class NominaItemDTO {
    private String mina;
    private Integer viajes;
    private BigDecimal toneladas;
    private BigDecimal tarifaBaseCop;
    private BigDecimal penalizacionCop;
    private boolean tienePenalizacion;
    private BigDecimal tarifaCop;
    private BigDecimal totalCop;
    private boolean configurada;
    private Long minaId;
    private List<Map<String, Object>> detalle;
    private List<Map<String, Object>> prestamos;
    private boolean tienePrestamos;
    private BigDecimal totalPrestamosCop;
    private BigDecimal netoPagarCop;
    private Long nominaId;
    private BigDecimal ajusteManual;
    private String notaRecordatorio;
    private BigDecimal totalFinalCop;
    private List<Map<String, Object>> pagos;
    private Long ultimoGastoId;
    private String reciboUrl;
    private BigDecimal totalPagadoCop;
    private BigDecimal saldoPendienteCop;
    private String estado;

    public String getMina() { return mina; }
    public void setMina(String mina) { this.mina = mina; }
    public Integer getViajes() { return viajes; }
    public void setViajes(Integer viajes) { this.viajes = viajes; }
    public BigDecimal getToneladas() { return toneladas; }
    public void setToneladas(BigDecimal toneladas) { this.toneladas = toneladas; }
    public BigDecimal getTarifaBaseCop() { return tarifaBaseCop; }
    public void setTarifaBaseCop(BigDecimal tarifaBaseCop) { this.tarifaBaseCop = tarifaBaseCop; }
    public BigDecimal getPenalizacionCop() { return penalizacionCop; }
    public void setPenalizacionCop(BigDecimal penalizacionCop) { this.penalizacionCop = penalizacionCop; }
    public boolean isTienePenalizacion() { return tienePenalizacion; }
    public void setTienePenalizacion(boolean tienePenalizacion) { this.tienePenalizacion = tienePenalizacion; }
    public BigDecimal getTarifaCop() { return tarifaCop; }
    public void setTarifaCop(BigDecimal tarifaCop) { this.tarifaCop = tarifaCop; }
    public BigDecimal getTotalCop() { return totalCop; }
    public void setTotalCop(BigDecimal totalCop) { this.totalCop = totalCop; }
    public boolean isConfigurada() { return configurada; }
    public void setConfigurada(boolean configurada) { this.configurada = configurada; }
    public Long getMinaId() { return minaId; }
    public void setMinaId(Long minaId) { this.minaId = minaId; }
    public List<Map<String, Object>> getDetalle() { return detalle; }
    public void setDetalle(List<Map<String, Object>> detalle) { this.detalle = detalle; }
    public List<Map<String, Object>> getPrestamos() { return prestamos; }
    public void setPrestamos(List<Map<String, Object>> prestamos) { this.prestamos = prestamos; }
    public boolean isTienePrestamos() { return tienePrestamos; }
    public void setTienePrestamos(boolean tienePrestamos) { this.tienePrestamos = tienePrestamos; }
    public BigDecimal getTotalPrestamosCop() { return totalPrestamosCop; }
    public void setTotalPrestamosCop(BigDecimal totalPrestamosCop) { this.totalPrestamosCop = totalPrestamosCop; }
    public BigDecimal getNetoPagarCop() { return netoPagarCop; }
    public void setNetoPagarCop(BigDecimal netoPagarCop) { this.netoPagarCop = netoPagarCop; }
    public Long getNominaId() { return nominaId; }
    public void setNominaId(Long nominaId) { this.nominaId = nominaId; }
    public BigDecimal getAjusteManual() { return ajusteManual; }
    public void setAjusteManual(BigDecimal ajusteManual) { this.ajusteManual = ajusteManual; }
    public String getNotaRecordatorio() { return notaRecordatorio; }
    public void setNotaRecordatorio(String notaRecordatorio) { this.notaRecordatorio = notaRecordatorio; }
    public BigDecimal getTotalFinalCop() { return totalFinalCop; }
    public void setTotalFinalCop(BigDecimal totalFinalCop) { this.totalFinalCop = totalFinalCop; }
    public List<Map<String, Object>> getPagos() { return pagos; }
    public void setPagos(List<Map<String, Object>> pagos) { this.pagos = pagos; }
    public Long getUltimoGastoId() { return ultimoGastoId; }
    public void setUltimoGastoId(Long ultimoGastoId) { this.ultimoGastoId = ultimoGastoId; }
    public String getReciboUrl() { return reciboUrl; }
    public void setReciboUrl(String reciboUrl) { this.reciboUrl = reciboUrl; }
    public BigDecimal getTotalPagadoCop() { return totalPagadoCop; }
    public void setTotalPagadoCop(BigDecimal totalPagadoCop) { this.totalPagadoCop = totalPagadoCop; }
    public BigDecimal getSaldoPendienteCop() { return saldoPendienteCop; }
    public void setSaldoPendienteCop(BigDecimal saldoPendienteCop) { this.saldoPendienteCop = saldoPendienteCop; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
}
