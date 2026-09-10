package com.auroraplus.modules.salud.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Cierre de caja diario — el resumen auditado que antes solo vivía en localStorage del
 * navegador (se perdía al cambiar de dispositivo o limpiar el navegador). Los cobros
 * individuales de ese día ya están en salud_cobros_consulta (ver CobroConsulta); este registro
 * es la "foto" del cierre: cuánto se contó, a qué tasa, y quién lo hizo.
 */
@Entity
@Table(name = "salud_cierres_caja", indexes = {
    @Index(name = "idx_salud_cierre_tenant_fecha", columnList = "tenant_id, fecha")
})
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class CierreCaja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(name = "hora_cierre", nullable = false, length = 20)
    private String horaCierre;

    @Column(name = "responsable_nombre", length = 150)
    private String responsableNombre;

    @Column(name = "tasa_bcv", precision = 12, scale = 4)
    private BigDecimal tasaBCV;

    @Column(name = "tasa_cop", precision = 12, scale = 4)
    private BigDecimal tasaCOP;

    @Column(name = "total_usd", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalUSD = BigDecimal.ZERO;

    @Column(name = "total_ves", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalVES = BigDecimal.ZERO;

    @Column(name = "total_cop", precision = 18, scale = 2)
    private BigDecimal totalCOP = BigDecimal.ZERO;

    @Column(name = "total_pacientes", nullable = false)
    private Integer totalPacientes = 0;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public String getHoraCierre() { return horaCierre; }
    public void setHoraCierre(String horaCierre) { this.horaCierre = horaCierre; }
    public String getResponsableNombre() { return responsableNombre; }
    public void setResponsableNombre(String responsableNombre) { this.responsableNombre = responsableNombre; }
    public BigDecimal getTasaBCV() { return tasaBCV; }
    public void setTasaBCV(BigDecimal tasaBCV) { this.tasaBCV = tasaBCV; }
    public BigDecimal getTasaCOP() { return tasaCOP; }
    public void setTasaCOP(BigDecimal tasaCOP) { this.tasaCOP = tasaCOP; }
    public BigDecimal getTotalUSD() { return totalUSD; }
    public void setTotalUSD(BigDecimal totalUSD) { this.totalUSD = totalUSD; }
    public BigDecimal getTotalVES() { return totalVES; }
    public void setTotalVES(BigDecimal totalVES) { this.totalVES = totalVES; }
    public BigDecimal getTotalCOP() { return totalCOP; }
    public void setTotalCOP(BigDecimal totalCOP) { this.totalCOP = totalCOP; }
    public Integer getTotalPacientes() { return totalPacientes; }
    public void setTotalPacientes(Integer totalPacientes) { this.totalPacientes = totalPacientes; }
    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(LocalDateTime creadoEn) { this.creadoEn = creadoEn; }
}
