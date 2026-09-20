package com.auroraplus.modules.construccion.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "proyectos_construccion")
public class ProyectoConstruccionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "codigo", nullable = false, length = 50)
    private String codigo;

    @Column(name = "nombre", nullable = false)
    private String nombre;

    @Column(name = "cliente", nullable = false)
    private String cliente;

    @Column(name = "ubicacion")
    private String ubicacion;

    @Column(name = "ingeniero_residente", length = 150)
    private String ingenieroResidente;

    @Column(name = "civ_residente", length = 50)
    private String civResidente;

    @Column(name = "fecha_inicio")
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin_estimada")
    private LocalDate fechaFinEstimada;

    @Column(name = "estado", nullable = false, length = 50)
    private String estado = "EN_EJECUCION";

    @Column(name = "monto_presupuesto_total", precision = 18, scale = 2)
    private BigDecimal montoPresupuestoTotal = BigDecimal.ZERO;

    @Column(name = "porcentaje_anticipo", precision = 5, scale = 2)
    private BigDecimal porcentajeAnticipo = new BigDecimal("20.00");

    @Column(name = "porcentaje_retencion_garantia", precision = 5, scale = 2)
    private BigDecimal porcentajeRetencionGarantia = new BigDecimal("10.00");

    @Column(name = "porcentaje_administracion", precision = 5, scale = 2)
    private BigDecimal porcentajeAdministracion = new BigDecimal("15.00");

    @Column(name = "porcentaje_utilidad", precision = 5, scale = 2)
    private BigDecimal porcentajeUtilidad = new BigDecimal("10.00");

    @Column(name = "iva", precision = 5, scale = 2)
    private BigDecimal iva = new BigDecimal("16.00");

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getCliente() { return cliente; }
    public void setCliente(String cliente) { this.cliente = cliente; }

    public String getUbicacion() { return ubicacion; }
    public void setUbicacion(String ubicacion) { this.ubicacion = ubicacion; }

    public String getIngenieroResidente() { return ingenieroResidente; }
    public void setIngenieroResidente(String ingenieroResidente) { this.ingenieroResidente = ingenieroResidente; }

    public String getCivResidente() { return civResidente; }
    public void setCivResidente(String civResidente) { this.civResidente = civResidente; }

    public LocalDate getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(LocalDate fechaInicio) { this.fechaInicio = fechaInicio; }

    public LocalDate getFechaFinEstimada() { return fechaFinEstimada; }
    public void setFechaFinEstimada(LocalDate fechaFinEstimada) { this.fechaFinEstimada = fechaFinEstimada; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public BigDecimal getMontoPresupuestoTotal() { return montoPresupuestoTotal; }
    public void setMontoPresupuestoTotal(BigDecimal montoPresupuestoTotal) { this.montoPresupuestoTotal = montoPresupuestoTotal; }

    public BigDecimal getPorcentajeAnticipo() { return porcentajeAnticipo; }
    public void setPorcentajeAnticipo(BigDecimal porcentajeAnticipo) { this.porcentajeAnticipo = porcentajeAnticipo; }

    public BigDecimal getPorcentajeRetencionGarantia() { return porcentajeRetencionGarantia; }
    public void setPorcentajeRetencionGarantia(BigDecimal porcentajeRetencionGarantia) { this.porcentajeRetencionGarantia = porcentajeRetencionGarantia; }

    public BigDecimal getPorcentajeAdministracion() { return porcentajeAdministracion; }
    public void setPorcentajeAdministracion(BigDecimal porcentajeAdministracion) { this.porcentajeAdministracion = porcentajeAdministracion; }

    public BigDecimal getPorcentajeUtilidad() { return porcentajeUtilidad; }
    public void setPorcentajeUtilidad(BigDecimal porcentajeUtilidad) { this.porcentajeUtilidad = porcentajeUtilidad; }

    public BigDecimal getIva() { return iva; }
    public void setIva(BigDecimal iva) { this.iva = iva; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
