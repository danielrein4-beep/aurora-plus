package com.auroraplus.modules.tamanacocomercial.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "rentabilidad_parametros_comercial")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class RentabilidadParametros {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin", nullable = false)
    private LocalDate fechaFin;

    @Column(name = "precio_venta_usd", precision = 18, scale = 2)
    private BigDecimal precioVentaUsd;

    @Column(name = "tasa_cambio_cop_usd", precision = 18, scale = 6)
    private BigDecimal tasaCambioCopUsd;

    @Column(name = "tasa_cambio_ves_usd", precision = 18, scale = 6)
    private BigDecimal tasaCambioVesUsd;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public LocalDate getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(LocalDate fechaInicio) { this.fechaInicio = fechaInicio; }
    public LocalDate getFechaFin() { return fechaFin; }
    public void setFechaFin(LocalDate fechaFin) { this.fechaFin = fechaFin; }
    public BigDecimal getPrecioVentaUsd() { return precioVentaUsd; }
    public void setPrecioVentaUsd(BigDecimal precioVentaUsd) { this.precioVentaUsd = precioVentaUsd; }
    public BigDecimal getTasaCambioCopUsd() { return tasaCambioCopUsd; }
    public void setTasaCambioCopUsd(BigDecimal tasaCambioCopUsd) { this.tasaCambioCopUsd = tasaCambioCopUsd; }
    public BigDecimal getTasaCambioVesUsd() { return tasaCambioVesUsd; }
    public void setTasaCambioVesUsd(BigDecimal tasaCambioVesUsd) { this.tasaCambioVesUsd = tasaCambioVesUsd; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
