package com.auroraplus.modules.construccion.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "valuaciones_construccion")
public class ValuacionConstruccionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "proyecto_id", nullable = false)
    private Long proyectoId;

    @Column(name = "numero_valuacion", nullable = false)
    private Integer numeroValuacion;

    @Column(name = "periodo_desde", nullable = false)
    private LocalDate periodoDesde;

    @Column(name = "periodo_hasta", nullable = false)
    private LocalDate periodoHasta;

    @Column(name = "fecha_emision", nullable = false)
    private LocalDate fechaEmision;

    @Column(name = "monto_bruto", precision = 18, scale = 2, nullable = false)
    private BigDecimal montoBruto = BigDecimal.ZERO;

    @Column(name = "amortizacion_anticipo", precision = 18, scale = 2, nullable = false)
    private BigDecimal amortizacionAnticipo = BigDecimal.ZERO;

    @Column(name = "retencion_fiel_cumplimiento", precision = 18, scale = 2, nullable = false)
    private BigDecimal retencionFielCumplimiento = BigDecimal.ZERO;

    @Column(name = "retencion_laboral", precision = 18, scale = 2, nullable = false)
    private BigDecimal retencionLaboral = BigDecimal.ZERO;

    @Column(name = "monto_subtotal", precision = 18, scale = 2, nullable = false)
    private BigDecimal montoSubtotal = BigDecimal.ZERO;

    @Column(name = "monto_iva", precision = 18, scale = 2, nullable = false)
    private BigDecimal montoIva = BigDecimal.ZERO;

    @Column(name = "monto_neto_a_cobrar", precision = 18, scale = 2, nullable = false)
    private BigDecimal montoNetoACobrar = BigDecimal.ZERO;

    @Column(name = "estado", nullable = false, length = 50)
    private String estado = "BORRADOR";

    @Column(name = "observaciones", columnDefinition = "TEXT")
    private String observaciones;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }

    public Long getProyectoId() { return proyectoId; }
    public void setProyectoId(Long proyectoId) { this.proyectoId = proyectoId; }

    public Integer getNumeroValuacion() { return numeroValuacion; }
    public void setNumeroValuacion(Integer numeroValuacion) { this.numeroValuacion = numeroValuacion; }

    public LocalDate getPeriodoDesde() { return periodoDesde; }
    public void setPeriodoDesde(LocalDate periodoDesde) { this.periodoDesde = periodoDesde; }

    public LocalDate getPeriodoHasta() { return periodoHasta; }
    public void setPeriodoHasta(LocalDate periodoHasta) { this.periodoHasta = periodoHasta; }

    public LocalDate getFechaEmision() { return fechaEmision; }
    public void setFechaEmision(LocalDate fechaEmision) { this.fechaEmision = fechaEmision; }

    public BigDecimal getMontoBruto() { return montoBruto; }
    public void setMontoBruto(BigDecimal montoBruto) { this.montoBruto = montoBruto; }

    public BigDecimal getAmortizacionAnticipo() { return amortizacionAnticipo; }
    public void setAmortizacionAnticipo(BigDecimal amortizacionAnticipo) { this.amortizacionAnticipo = amortizacionAnticipo; }

    public BigDecimal getRetencionFielCumplimiento() { return retencionFielCumplimiento; }
    public void setRetencionFielCumplimiento(BigDecimal retencionFielCumplimiento) { this.retencionFielCumplimiento = retencionFielCumplimiento; }

    public BigDecimal getRetencionLaboral() { return retencionLaboral; }
    public void setRetencionLaboral(BigDecimal retencionLaboral) { this.retencionLaboral = retencionLaboral; }

    public BigDecimal getMontoSubtotal() { return montoSubtotal; }
    public void setMontoSubtotal(BigDecimal montoSubtotal) { this.montoSubtotal = montoSubtotal; }

    public BigDecimal getMontoIva() { return montoIva; }
    public void setMontoIva(BigDecimal montoIva) { this.montoIva = montoIva; }

    public BigDecimal getMontoNetoACobrar() { return montoNetoACobrar; }
    public void setMontoNetoACobrar(BigDecimal montoNetoACobrar) { this.montoNetoACobrar = montoNetoACobrar; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
