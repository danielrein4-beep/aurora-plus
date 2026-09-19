package com.auroraplus.modules.veterinaria.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Cotización y presupuesto clínico para procedimientos veterinarios.
 */
@Entity
@Table(name = "cotizaciones_veterinarias", indexes = {
    @Index(name = "idx_vet_cotiz_tenant_mascota", columnList = "tenant_id, mascota_id")
})
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class CotizacionVeterinaria {

    public enum EstadoCotizacion {
        COTIZADA,
        PLANIFICADA,
        REALIZADA,
        CANCELADA
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "mascota_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Mascota mascota;

    @Column(name = "procedimiento_nombre", nullable = false, length = 150)
    private String procedimientoNombre;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "costo_usd", nullable = false, precision = 18, scale = 2)
    private BigDecimal costoUSD;

    @Column(name = "costo_ves", precision = 18, scale = 2)
    private BigDecimal costoVES;

    @Column(name = "costo_cop", precision = 18, scale = 2)
    private BigDecimal costoCOP;

    @Column(name = "tasa_bcv", precision = 12, scale = 4)
    private BigDecimal tasaBCV;

    @Column(name = "tasa_cop", precision = 12, scale = 4)
    private BigDecimal tasaCOP;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EstadoCotizacion estado = EstadoCotizacion.COTIZADA;

    @Column(nullable = false)
    private LocalDate fecha = LocalDate.now();

    @Column(name = "fecha_planificada")
    private LocalDate fechaPlanificada;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Mascota getMascota() { return mascota; }
    public void setMascota(Mascota mascota) { this.mascota = mascota; }
    public String getProcedimientoNombre() { return procedimientoNombre; }
    public void setProcedimientoNombre(String procedimientoNombre) { this.procedimientoNombre = procedimientoNombre; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public BigDecimal getCostoUSD() { return costoUSD; }
    public void setCostoUSD(BigDecimal costoUSD) { this.costoUSD = costoUSD; }
    public BigDecimal getCostoVES() { return costoVES; }
    public void setCostoVES(BigDecimal costoVES) { this.costoVES = costoVES; }
    public BigDecimal getCostoCOP() { return costoCOP; }
    public void setCostoCOP(BigDecimal costoCOP) { this.costoCOP = costoCOP; }
    public BigDecimal getTasaBCV() { return tasaBCV; }
    public void setTasaBCV(BigDecimal tasaBCV) { this.tasaBCV = tasaBCV; }
    public BigDecimal getTasaCOP() { return tasaCOP; }
    public void setTasaCOP(BigDecimal tasaCOP) { this.tasaCOP = tasaCOP; }
    public EstadoCotizacion getEstado() { return estado; }
    public void setEstado(EstadoCotizacion estado) { this.estado = estado; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public LocalDate getFechaPlanificada() { return fechaPlanificada; }
    public void setFechaPlanificada(LocalDate fechaPlanificada) { this.fechaPlanificada = fechaPlanificada; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(LocalDateTime creadoEn) { this.creadoEn = creadoEn; }
}
