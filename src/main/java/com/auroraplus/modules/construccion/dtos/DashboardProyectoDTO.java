package com.auroraplus.modules.construccion.dtos;

import java.math.BigDecimal;
import java.util.List;

public class DashboardProyectoDTO {
    private Long proyectoId;
    private String codigo;
    private String nombre;
    private String estado;
    private BigDecimal montoPresupuestoTotal;
    private BigDecimal montoTotalEjecutado;
    private BigDecimal montoTotalCobrado;
    private BigDecimal porcentajeAvanceFisico;
    private BigDecimal porcentajeAvanceFinanciero;
    private int partidasTotales;
    private int partidasCompletadas;
    private int partidasEnEjecucion;
    private int partidasSobreEjecutadas;
    private int insumosTotales;
    private int insumosCriticos;
    private int despachosEnTransito;
    private List<String> alertas;

    public Long getProyectoId() { return proyectoId; }
    public void setProyectoId(Long proyectoId) { this.proyectoId = proyectoId; }

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public BigDecimal getMontoPresupuestoTotal() { return montoPresupuestoTotal; }
    public void setMontoPresupuestoTotal(BigDecimal montoPresupuestoTotal) { this.montoPresupuestoTotal = montoPresupuestoTotal; }

    public BigDecimal getMontoTotalEjecutado() { return montoTotalEjecutado; }
    public void setMontoTotalEjecutado(BigDecimal montoTotalEjecutado) { this.montoTotalEjecutado = montoTotalEjecutado; }

    public BigDecimal getMontoTotalCobrado() { return montoTotalCobrado; }
    public void setMontoTotalCobrado(BigDecimal montoTotalCobrado) { this.montoTotalCobrado = montoTotalCobrado; }

    public BigDecimal getPorcentajeAvanceFisico() { return porcentajeAvanceFisico; }
    public void setPorcentajeAvanceFisico(BigDecimal porcentajeAvanceFisico) { this.porcentajeAvanceFisico = porcentajeAvanceFisico; }

    public BigDecimal getPorcentajeAvanceFinanciero() { return porcentajeAvanceFinanciero; }
    public void setPorcentajeAvanceFinanciero(BigDecimal porcentajeAvanceFinanciero) { this.porcentajeAvanceFinanciero = porcentajeAvanceFinanciero; }

    public int getPartidasTotales() { return partidasTotales; }
    public void setPartidasTotales(int partidasTotales) { this.partidasTotales = partidasTotales; }

    public int getPartidasCompletadas() { return partidasCompletadas; }
    public void setPartidasCompletadas(int partidasCompletadas) { this.partidasCompletadas = partidasCompletadas; }

    public int getPartidasEnEjecucion() { return partidasEnEjecucion; }
    public void setPartidasEnEjecucion(int partidasEnEjecucion) { this.partidasEnEjecucion = partidasEnEjecucion; }

    public int getPartidasSobreEjecutadas() { return partidasSobreEjecutadas; }
    public void setPartidasSobreEjecutadas(int partidasSobreEjecutadas) { this.partidasSobreEjecutadas = partidasSobreEjecutadas; }

    public int getInsumosTotales() { return insumosTotales; }
    public void setInsumosTotales(int insumosTotales) { this.insumosTotales = insumosTotales; }

    public int getInsumosCriticos() { return insumosCriticos; }
    public void setInsumosCriticos(int insumosCriticos) { this.insumosCriticos = insumosCriticos; }

    public int getDespachosEnTransito() { return despachosEnTransito; }
    public void setDespachosEnTransito(int despachosEnTransito) { this.despachosEnTransito = despachosEnTransito; }

    public List<String> getAlertas() { return alertas; }
    public void setAlertas(List<String> alertas) { this.alertas = alertas; }
}
