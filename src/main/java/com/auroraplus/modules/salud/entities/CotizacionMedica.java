package com.auroraplus.modules.salud.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Cotización de un procedimiento para un paciente — antes vivía 100% en localStorage del
 * navegador (una cotización aprobada en la PC del consultorio no la veía nadie desde el celular,
 * y se perdía si se limpiaba el navegador).
 */
@Entity
@Table(name = "salud_cotizaciones", indexes = {
    @Index(name = "idx_salud_cotizacion_tenant_paciente", columnList = "tenant_id, paciente_id")
})
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class CotizacionMedica {

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
    @JoinColumn(name = "paciente_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Paciente paciente;

    @Column(name = "procedimiento_nombre", nullable = false, length = 255)
    private String procedimientoNombre;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "costo_usd", nullable = false, precision = 14, scale = 2)
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
    @Column(nullable = false, length = 20)
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
    public Paciente getPaciente() { return paciente; }
    public void setPaciente(Paciente paciente) { this.paciente = paciente; }
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
