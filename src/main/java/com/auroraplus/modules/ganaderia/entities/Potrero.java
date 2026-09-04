package com.auroraplus.modules.ganaderia.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/** Potrero/lote de pastoreo: unidad de ubicación física del hato, base del manejo rotacional. */
@Entity
@Table(name = "potreros")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Potrero {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String nombre;

    @Column(name = "area_hectareas", precision = 10, scale = 2)
    private BigDecimal areaHectareas;

    @Column(name = "capacidad_animales")
    private Integer capacidadAnimales;

    @Column(name = "tipo_pasto")
    private String tipoPasto;

    @Column(nullable = false, length = 20)
    private String estado = "ACTIVO"; // ACTIVO, EN_DESCANSO

    // Se fija al pasar a EN_DESCANSO (ver PotreroController) y se limpia al volver a ACTIVO —
    // así se puede calcular cuántos días lleva el suelo recuperándose sin cargar animales.
    @Column(name = "fecha_inicio_descanso")
    private LocalDate fechaInicioDescanso;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public BigDecimal getAreaHectareas() { return areaHectareas; }
    public void setAreaHectareas(BigDecimal areaHectareas) { this.areaHectareas = areaHectareas; }
    public Integer getCapacidadAnimales() { return capacidadAnimales; }
    public void setCapacidadAnimales(Integer capacidadAnimales) { this.capacidadAnimales = capacidadAnimales; }
    public String getTipoPasto() { return tipoPasto; }
    public void setTipoPasto(String tipoPasto) { this.tipoPasto = tipoPasto; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public LocalDate getFechaInicioDescanso() { return fechaInicioDescanso; }
    public void setFechaInicioDescanso(LocalDate fechaInicioDescanso) { this.fechaInicioDescanso = fechaInicioDescanso; }

    @Transient
    public Long getDiasEnDescanso() {
        if (!"EN_DESCANSO".equals(estado) || fechaInicioDescanso == null) return null;
        return ChronoUnit.DAYS.between(fechaInicioDescanso, LocalDate.now());
    }
}
