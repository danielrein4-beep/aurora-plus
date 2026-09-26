package com.auroraplus.core.personal.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.time.LocalDate;

/** docs/personal-nomina-contract.md §4 — ciclo de vida: BORRADOR -> CALCULADA -> EN_REVISION -> APROBADA -> PAGADA (o REVERSADA). */
@Entity
@Table(name = "periodos_nomina")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class PeriodoNomina {

    public enum Estado { BORRADOR, CALCULADA, EN_REVISION, APROBADA, PAGADA, REVERSADA }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String nombre;

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin", nullable = false)
    private LocalDate fechaFin;

    @Column(name = "fecha_pago_planificada")
    private LocalDate fechaPagoPlanificada;

    @Column(nullable = false, length = 3)
    private String moneda;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Estado estado = Estado.BORRADOR;

    @Column(name = "calculado_por")
    private Long calculadoPorUsuarioId;

    @Column(name = "fecha_calculo")
    private java.time.LocalDateTime fechaCalculo;

    @Column(name = "aprobado_por")
    private Long aprobadoPorUsuarioId;

    @Column(name = "fecha_aprobacion")
    private java.time.LocalDateTime fechaAprobacion;

    // Bloqueo optimista: dos solicitudes de "calcular este período" al mismo tiempo no deben
    // ambas creer que ganaron y generar NominaEmpleado duplicada por empleado (ver
    // MotorNominaService.calcularPeriodo y la prueba de concurrencia).
    @Version
    @Column(nullable = false, columnDefinition = "bigint default 0")
    private Long version = 0L;

    /** SEMANAL, QUINCENAL o MENSUAL: solo entran los trabajadores que cobran así. Null = todos. */
    @Column(length = 12)
    private String frecuencia;

    public String getFrecuencia() { return frecuencia; }
    public void setFrecuencia(String frecuencia) { this.frecuencia = frecuencia; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public LocalDate getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(LocalDate fechaInicio) { this.fechaInicio = fechaInicio; }
    public LocalDate getFechaFin() { return fechaFin; }
    public void setFechaFin(LocalDate fechaFin) { this.fechaFin = fechaFin; }
    public LocalDate getFechaPagoPlanificada() { return fechaPagoPlanificada; }
    public void setFechaPagoPlanificada(LocalDate fechaPagoPlanificada) { this.fechaPagoPlanificada = fechaPagoPlanificada; }
    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }
    public Estado getEstado() { return estado; }
    public void setEstado(Estado estado) { this.estado = estado; }
    public Long getCalculadoPorUsuarioId() { return calculadoPorUsuarioId; }
    public void setCalculadoPorUsuarioId(Long calculadoPorUsuarioId) { this.calculadoPorUsuarioId = calculadoPorUsuarioId; }
    public java.time.LocalDateTime getFechaCalculo() { return fechaCalculo; }
    public void setFechaCalculo(java.time.LocalDateTime fechaCalculo) { this.fechaCalculo = fechaCalculo; }
    public Long getAprobadoPorUsuarioId() { return aprobadoPorUsuarioId; }
    public void setAprobadoPorUsuarioId(Long aprobadoPorUsuarioId) { this.aprobadoPorUsuarioId = aprobadoPorUsuarioId; }
    public java.time.LocalDateTime getFechaAprobacion() { return fechaAprobacion; }
    public void setFechaAprobacion(java.time.LocalDateTime fechaAprobacion) { this.fechaAprobacion = fechaAprobacion; }
    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
