package com.auroraplus.modules.construccion.entities;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "bitacora_construccion")
public class BitacoraConstruccionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "proyecto_id", nullable = false)
    private Long proyectoId;

    @Column(name = "fecha", nullable = false)
    private LocalDate fecha;

    @Column(name = "clima", nullable = false, length = 50)
    private String clima = "SOLEADO";

    @Column(name = "personal_activo", nullable = false)
    private Integer personalActivo = 0;

    @Column(name = "cuadrillas_activas")
    private String cuadrillasActivas;

    @Column(name = "maquinaria_operativa", columnDefinition = "TEXT")
    private String maquinariaOperativa;

    @Column(name = "actividades_ejecutadas", nullable = false, columnDefinition = "TEXT")
    private String actividadesEjecutadas;

    @Column(name = "observaciones_e_incidentes", columnDefinition = "TEXT")
    private String observacionesEIncidentes;

    @Column(name = "elaborado_por", length = 150)
    private String elaboradoPor;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }

    public Long getProyectoId() { return proyectoId; }
    public void setProyectoId(Long proyectoId) { this.proyectoId = proyectoId; }

    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }

    public String getClima() { return clima; }
    public void setClima(String clima) { this.clima = clima; }

    public Integer getPersonalActivo() { return personalActivo; }
    public void setPersonalActivo(Integer personalActivo) { this.personalActivo = personalActivo; }

    public String getCuadrillasActivas() { return cuadrillasActivas; }
    public void setCuadrillasActivas(String cuadrillasActivas) { this.cuadrillasActivas = cuadrillasActivas; }

    public String getMaquinariaOperativa() { return maquinariaOperativa; }
    public void setMaquinariaOperativa(String maquinariaOperativa) { this.maquinariaOperativa = maquinariaOperativa; }

    public String getActividadesEjecutadas() { return actividadesEjecutadas; }
    public void setActividadesEjecutadas(String actividadesEjecutadas) { this.actividadesEjecutadas = actividadesEjecutadas; }

    public String getObservacionesEIncidentes() { return observacionesEIncidentes; }
    public void setObservacionesEIncidentes(String observacionesEIncidentes) { this.observacionesEIncidentes = observacionesEIncidentes; }

    public String getElaboradoPor() { return elaboradoPor; }
    public void setElaboradoPor(String elaboradoPor) { this.elaboradoPor = elaboradoPor; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
