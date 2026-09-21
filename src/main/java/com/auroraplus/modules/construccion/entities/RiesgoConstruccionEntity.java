package com.auroraplus.modules.construccion.entities;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "riesgos_construccion")
public class RiesgoConstruccionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "proyecto_id", nullable = false)
    private Long proyectoId;

    @Column(name = "codigo", nullable = false, length = 50)
    private String codigo;

    @Column(name = "proceso_frente", nullable = false, length = 150)
    private String procesoFrente;

    @Column(name = "peligro", columnDefinition = "TEXT", nullable = false)
    private String peligro;

    @Column(name = "riesgo_consecuencia", columnDefinition = "TEXT", nullable = false)
    private String riesgoConsecuencia;

    @Column(name = "categoria", nullable = false, length = 50)
    private String categoria; // ALTURA, EXCAVACION, ELECTRICO, MECANICO, QUIMICO, LOCATIVO, BIOMECANICO, FISICO

    @Column(name = "probabilidad", nullable = false)
    private Integer probabilidad = 1; // 1 a 5

    @Column(name = "severidad", nullable = false)
    private Integer severidad = 1; // 1 a 5

    @Column(name = "nivel_riesgo", nullable = false, length = 30)
    private String nivelRiesgo = "BAJO"; // BAJO, MEDIO, ALTO, CRITICO

    @Column(name = "medidas_control", columnDefinition = "TEXT", nullable = false)
    private String medidasControl;

    @Column(name = "responsable", length = 150)
    private String responsable;

    @Column(name = "estado", nullable = false, length = 50)
    private String estado = "IDENTIFICADO"; // IDENTIFICADO, EN_MITIGACION, CONTROLADO, RESUELTO

    @Column(name = "fecha_evaluacion", nullable = false)
    private LocalDate fechaEvaluacion;

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

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public String getProcesoFrente() { return procesoFrente; }
    public void setProcesoFrente(String procesoFrente) { this.procesoFrente = procesoFrente; }

    public String getPeligro() { return peligro; }
    public void setPeligro(String peligro) { this.peligro = peligro; }

    public String getRiesgoConsecuencia() { return riesgoConsecuencia; }
    public void setRiesgoConsecuencia(String riesgoConsecuencia) { this.riesgoConsecuencia = riesgoConsecuencia; }

    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }

    public Integer getProbabilidad() { return probabilidad; }
    public void setProbabilidad(Integer probabilidad) { this.probabilidad = probabilidad; }

    public Integer getSeveridad() { return severidad; }
    public void setSeveridad(Integer severidad) { this.severidad = severidad; }

    public String getNivelRiesgo() { return nivelRiesgo; }
    public void setNivelRiesgo(String nivelRiesgo) { this.nivelRiesgo = nivelRiesgo; }

    public String getMedidasControl() { return medidasControl; }
    public void setMedidasControl(String medidasControl) { this.medidasControl = medidasControl; }

    public String getResponsable() { return responsable; }
    public void setResponsable(String responsable) { this.responsable = responsable; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public LocalDate getFechaEvaluacion() { return fechaEvaluacion; }
    public void setFechaEvaluacion(LocalDate fechaEvaluacion) { this.fechaEvaluacion = fechaEvaluacion; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
