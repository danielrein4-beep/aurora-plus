package com.auroraplus.modules.construccion.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "mantenimientos_maquinaria_construccion")
public class MantenimientoMaquinariaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "maquinaria_id", nullable = false)
    private Long maquinariaId;

    @Column(name = "tipo", nullable = false, length = 50)
    private String tipo; // PREVENTIVO, CORRECTIVO, OVERHAUL, INSPECCION_DIARIA

    @Column(name = "fecha_mantenimiento", nullable = false)
    private LocalDate fechaMantenimiento;

    @Column(name = "horometro_en_mantenimiento", precision = 10, scale = 2, nullable = false)
    private BigDecimal horometroEnMantenimiento;

    @Column(name = "proximo_horometro_mantenimiento", precision = 10, scale = 2)
    private BigDecimal proximoHorometroMantenimiento;

    @Column(name = "descripcion_trabajo", columnDefinition = "TEXT", nullable = false)
    private String descripcionTrabajo;

    @Column(name = "mecanico_o_taller", length = 150)
    private String mecanicoOTaller;

    @Column(name = "costo_total_usd", precision = 12, scale = 2)
    private BigDecimal costoTotalUsd = BigDecimal.ZERO;

    @Column(name = "repuestos_utilizados", columnDefinition = "TEXT")
    private String repuestosUtilizados;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }

    public Long getMaquinariaId() { return maquinariaId; }
    public void setMaquinariaId(Long maquinariaId) { this.maquinariaId = maquinariaId; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public LocalDate getFechaMantenimiento() { return fechaMantenimiento; }
    public void setFechaMantenimiento(LocalDate fechaMantenimiento) { this.fechaMantenimiento = fechaMantenimiento; }

    public BigDecimal getHorometroEnMantenimiento() { return horometroEnMantenimiento; }
    public void setHorometroEnMantenimiento(BigDecimal horometroEnMantenimiento) { this.horometroEnMantenimiento = horometroEnMantenimiento; }

    public BigDecimal getProximoHorometroMantenimiento() { return proximoHorometroMantenimiento; }
    public void setProximoHorometroMantenimiento(BigDecimal proximoHorometroMantenimiento) { this.proximoHorometroMantenimiento = proximoHorometroMantenimiento; }

    public String getDescripcionTrabajo() { return descripcionTrabajo; }
    public void setDescripcionTrabajo(String descripcionTrabajo) { this.descripcionTrabajo = descripcionTrabajo; }

    public String getMecanicoOTaller() { return mecanicoOTaller; }
    public void setMecanicoOTaller(String mecanicoOTaller) { this.mecanicoOTaller = mecanicoOTaller; }

    public BigDecimal getCostoTotalUsd() { return costoTotalUsd; }
    public void setCostoTotalUsd(BigDecimal costoTotalUsd) { this.costoTotalUsd = costoTotalUsd; }

    public String getRepuestosUtilizados() { return repuestosUtilizados; }
    public void setRepuestosUtilizados(String repuestosUtilizados) { this.repuestosUtilizados = repuestosUtilizados; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
