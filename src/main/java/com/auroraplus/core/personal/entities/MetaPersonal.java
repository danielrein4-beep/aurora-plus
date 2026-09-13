package com.auroraplus.core.personal.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Meta asignada a un empleado (flag "metas") — SeguimientoMeta acumula el avance real. */
@Entity
@Table(name = "metas_personal")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class MetaPersonal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "empleado_id", nullable = false)
    private Long empleadoId;

    @Column(nullable = false)
    private String nombre;

    private String descripcion;

    @Column(name = "valor_objetivo", nullable = false, precision = 18, scale = 4)
    private BigDecimal valorObjetivo;

    @Column(nullable = false, length = 20)
    private String unidad;

    @Column(name = "periodo_desde", nullable = false)
    private LocalDate periodoDesde;

    @Column(name = "periodo_hasta", nullable = false)
    private LocalDate periodoHasta;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Long getEmpleadoId() { return empleadoId; }
    public void setEmpleadoId(Long empleadoId) { this.empleadoId = empleadoId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public BigDecimal getValorObjetivo() { return valorObjetivo; }
    public void setValorObjetivo(BigDecimal valorObjetivo) { this.valorObjetivo = valorObjetivo; }
    public String getUnidad() { return unidad; }
    public void setUnidad(String unidad) { this.unidad = unidad; }
    public LocalDate getPeriodoDesde() { return periodoDesde; }
    public void setPeriodoDesde(LocalDate periodoDesde) { this.periodoDesde = periodoDesde; }
    public LocalDate getPeriodoHasta() { return periodoHasta; }
    public void setPeriodoHasta(LocalDate periodoHasta) { this.periodoHasta = periodoHasta; }
}
