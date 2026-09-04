package com.auroraplus.modules.tamanacocomercial.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "nomina_comercial")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Nomina {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String mina;

    @Column(name = "fecha_inicio")
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin")
    private LocalDate fechaFin;

    @Column(name = "total_neto_carbon", precision = 18, scale = 2)
    private BigDecimal totalNetoCarbon = BigDecimal.ZERO;

    @Column(name = "ajuste_manual", precision = 18, scale = 2)
    private BigDecimal ajusteManual = BigDecimal.ZERO;

    @Column(name = "nota_recordatorio", length = 255)
    private String notaRecordatorio;

    @Column(name = "total_apresupuestar", precision = 18, scale = 2)
    private BigDecimal totalApresupuestar = BigDecimal.ZERO;

    @Column(name = "estado_pago")
    private String estadoPago = "PENDIENTE";

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getMina() { return mina; }
    public void setMina(String mina) { this.mina = mina != null ? mina.trim().toUpperCase() : null; }
    public LocalDate getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(LocalDate fechaInicio) { this.fechaInicio = fechaInicio; }
    public LocalDate getFechaFin() { return fechaFin; }
    public void setFechaFin(LocalDate fechaFin) { this.fechaFin = fechaFin; }
    public BigDecimal getTotalNetoCarbon() { return totalNetoCarbon; }
    public void setTotalNetoCarbon(BigDecimal totalNetoCarbon) { this.totalNetoCarbon = totalNetoCarbon; }
    public BigDecimal getAjusteManual() { return ajusteManual != null ? ajusteManual : BigDecimal.ZERO; }
    public void setAjusteManual(BigDecimal ajusteManual) { this.ajusteManual = ajusteManual; }
    public String getNotaRecordatorio() { return notaRecordatorio; }
    public void setNotaRecordatorio(String notaRecordatorio) { this.notaRecordatorio = notaRecordatorio; }
    public BigDecimal getTotalApresupuestar() { return totalApresupuestar; }
    public void setTotalApresupuestar(BigDecimal totalApresupuestar) { this.totalApresupuestar = totalApresupuestar; }
    public String getEstadoPago() { return estadoPago; }
    public void setEstadoPago(String estadoPago) { this.estadoPago = estadoPago; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
