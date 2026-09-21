package com.auroraplus.modules.construccion.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "cuadrillas_construccion")
public class CuadrillaConstruccionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "proyecto_id", nullable = false)
    private Long proyectoId;

    @Column(name = "partida_id")
    private Long partidaId;

    @Column(name = "codigo", nullable = false, length = 50)
    private String codigo;

    @Column(name = "nombre", nullable = false, length = 150)
    private String nombre;

    @Column(name = "especialidad", nullable = false, length = 50)
    private String especialidad; // CONCRETO_Y_ENCOFRADO, ACERO_Y_CABILLAS, ALBANILERIA, MOVIMIENTO_TIERRAS, INSTALACIONES_ELECTRICAS, INSTALACIONES_SANITARIAS, ACABADOS_Y_PINTURA, GENERAL

    @Column(name = "frente_trabajo", nullable = false, length = 150)
    private String frenteTrabajo;

    @Column(name = "capataz_responsable", nullable = false, length = 150)
    private String capatazResponsable;

    @Column(name = "cantidad_oficiales", nullable = false)
    private Integer cantidadOficiales = 1;

    @Column(name = "cantidad_ayudantes", nullable = false)
    private Integer cantidadAyudantes = 1;

    @Column(name = "cantidad_total_personal", nullable = false)
    private Integer cantidadTotalPersonal = 2;

    @Column(name = "rendimiento_diario_estimado", precision = 10, scale = 2)
    private BigDecimal rendimientoDiarioEstimado;

    @Column(name = "unidad_medida_rendimiento", length = 20)
    private String unidadMedidaRendimiento = "m2/dia";

    @Column(name = "estado", nullable = false, length = 50)
    private String estado = "ACTIVA"; // ACTIVA, EN_STANDBY, REASIGNADA, FINALIZADA

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin")
    private LocalDate fechaFin;

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

    public Long getPartidaId() { return partidaId; }
    public void setPartidaId(Long partidaId) { this.partidaId = partidaId; }

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getEspecialidad() { return especialidad; }
    public void setEspecialidad(String especialidad) { this.especialidad = especialidad; }

    public String getFrenteTrabajo() { return frenteTrabajo; }
    public void setFrenteTrabajo(String frenteTrabajo) { this.frenteTrabajo = frenteTrabajo; }

    
    public String getCapatazLider() { return capatazResponsable; }
    public void setCapatazLider(String capatazLider) {
        if (this.capatazResponsable == null || this.capatazResponsable.trim().isEmpty()) {
            this.capatazResponsable = capatazLider;
        }
    }

    public String getCapatazResponsable() { return capatazResponsable; }
    public void setCapatazResponsable(String capatazResponsable) { this.capatazResponsable = capatazResponsable; }

    public Integer getCantidadOficiales() { return cantidadOficiales; }
    public void setCantidadOficiales(Integer cantidadOficiales) { this.cantidadOficiales = cantidadOficiales; }

    public Integer getCantidadAyudantes() { return cantidadAyudantes; }
    public void setCantidadAyudantes(Integer cantidadAyudantes) { this.cantidadAyudantes = cantidadAyudantes; }

    public Integer getCantidadTotalPersonal() { return cantidadTotalPersonal; }
    public void setCantidadTotalPersonal(Integer cantidadTotalPersonal) { this.cantidadTotalPersonal = cantidadTotalPersonal; }

    public BigDecimal getRendimientoDiarioEstimado() { return rendimientoDiarioEstimado; }
    public void setRendimientoDiarioEstimado(BigDecimal rendimientoDiarioEstimado) { this.rendimientoDiarioEstimado = rendimientoDiarioEstimado; }

    public String getUnidadMedidaRendimiento() { return unidadMedidaRendimiento; }
    public void setUnidadMedidaRendimiento(String unidadMedidaRendimiento) { this.unidadMedidaRendimiento = unidadMedidaRendimiento; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public LocalDate getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(LocalDate fechaInicio) { this.fechaInicio = fechaInicio; }

    public LocalDate getFechaFin() { return fechaFin; }
    public void setFechaFin(LocalDate fechaFin) { this.fechaFin = fechaFin; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
