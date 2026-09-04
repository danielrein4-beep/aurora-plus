package com.auroraplus.modules.ganaderia.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/** Catálogo de medicamentos veterinarios, con sus períodos de retiro sanitario. */
@Entity
@Table(name = "medicamentos")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Medicamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String nombre;

    @Column(name = "tipo_tratamiento")
    private String tipoTratamiento; // ANTIBIOTICO, ANTIPARASITARIO, ANTIINFLAMATORIO...

    @Column(name = "dias_retiro_leche", nullable = false)
    private Integer diasRetiroLeche = 0;

    @Column(name = "dias_retiro_carne", nullable = false)
    private Integer diasRetiroCarne = 0;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getTipoTratamiento() { return tipoTratamiento; }
    public void setTipoTratamiento(String tipoTratamiento) { this.tipoTratamiento = tipoTratamiento; }
    public Integer getDiasRetiroLeche() { return diasRetiroLeche; }
    public void setDiasRetiroLeche(Integer diasRetiroLeche) { this.diasRetiroLeche = diasRetiroLeche; }
    public Integer getDiasRetiroCarne() { return diasRetiroCarne; }
    public void setDiasRetiroCarne(Integer diasRetiroCarne) { this.diasRetiroCarne = diasRetiroCarne; }
}
