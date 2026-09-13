package com.auroraplus.core.personal.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/** Catálogo de conceptos de nómina del tenant (flag "nomina-avanzada") — cada uno define sus propios. */
@Entity
@Table(name = "conceptos_nomina")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class ConceptoNomina {

    public enum Tipo { ASIGNACION, DEDUCCION, APORTE_PATRONAL }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false, length = 40)
    private String codigo;

    @Column(nullable = false)
    private String nombre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Tipo tipo;

    @Column(nullable = false)
    private boolean activo = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public Tipo getTipo() { return tipo; }
    public void setTipo(Tipo tipo) { this.tipo = tipo; }
    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }
}
