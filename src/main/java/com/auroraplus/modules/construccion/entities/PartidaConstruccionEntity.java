package com.auroraplus.modules.construccion.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "partidas_construccion")
public class PartidaConstruccionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "proyecto_id", nullable = false)
    private Long proyectoId;

    @Column(name = "capitulo_id")
    private Long capituloId;

    @Column(name = "codigo_covenin", nullable = false, length = 50)
    private String codigoCovenin;

    @Column(name = "descripcion", nullable = false, columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "unidad", nullable = false, length = 20)
    private String unidad;

    @Column(name = "cantidad_presupuestada", precision = 14, scale = 4, nullable = false)
    private BigDecimal cantidadPresupuestada = BigDecimal.ZERO;

    @Column(name = "precio_unitario", precision = 18, scale = 2, nullable = false)
    private BigDecimal precioUnitario = BigDecimal.ZERO;

    @Column(name = "cantidad_ejecutada_acumulada", precision = 14, scale = 4, nullable = false)
    private BigDecimal cantidadEjecutadaAcumulada = BigDecimal.ZERO;

    @Column(name = "costo_materiales", precision = 18, scale = 2)
    private BigDecimal costoMateriales = BigDecimal.ZERO;

    @Column(name = "costo_equipos", precision = 18, scale = 2)
    private BigDecimal costoEquipos = BigDecimal.ZERO;

    @Column(name = "costo_mano_obra", precision = 18, scale = 2)
    private BigDecimal costoManoObra = BigDecimal.ZERO;

    @Column(name = "rendimiento_diario", precision = 12, scale = 2)
    private BigDecimal rendimientoDiario = BigDecimal.ZERO;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }

    public Long getProyectoId() { return proyectoId; }
    public void setProyectoId(Long proyectoId) { this.proyectoId = proyectoId; }

    public Long getCapituloId() { return capituloId; }
    public void setCapituloId(Long capituloId) { this.capituloId = capituloId; }

    public String getCodigoCovenin() { return codigoCovenin; }
    public void setCodigoCovenin(String codigoCovenin) { this.codigoCovenin = codigoCovenin; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public String getUnidad() { return unidad; }
    public void setUnidad(String unidad) { this.unidad = unidad; }

    public BigDecimal getCantidadPresupuestada() { return cantidadPresupuestada; }
    public void setCantidadPresupuestada(BigDecimal cantidadPresupuestada) { this.cantidadPresupuestada = cantidadPresupuestada; }

    public BigDecimal getPrecioUnitario() { return precioUnitario; }
    public void setPrecioUnitario(BigDecimal precioUnitario) { this.precioUnitario = precioUnitario; }

    public BigDecimal getCantidadEjecutadaAcumulada() { return cantidadEjecutadaAcumulada; }
    public void setCantidadEjecutadaAcumulada(BigDecimal cantidadEjecutadaAcumulada) { this.cantidadEjecutadaAcumulada = cantidadEjecutadaAcumulada; }

    public BigDecimal getCostoMateriales() { return costoMateriales; }
    public void setCostoMateriales(BigDecimal costoMateriales) { this.costoMateriales = costoMateriales; }

    public BigDecimal getCostoEquipos() { return costoEquipos; }
    public void setCostoEquipos(BigDecimal costoEquipos) { this.costoEquipos = costoEquipos; }

    public BigDecimal getCostoManoObra() { return costoManoObra; }
    public void setCostoManoObra(BigDecimal costoManoObra) { this.costoManoObra = costoManoObra; }

    public BigDecimal getRendimientoDiario() { return rendimientoDiario; }
    public void setRendimientoDiario(BigDecimal rendimientoDiario) { this.rendimientoDiario = rendimientoDiario; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
