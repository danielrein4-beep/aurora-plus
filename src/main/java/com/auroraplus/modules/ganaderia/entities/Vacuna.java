package com.auroraplus.modules.ganaderia.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/** Catálogo de vacunas disponibles, con sus períodos de retiro sanitario (obligatorios, no opcionales). */
@Entity
@Table(name = "vacunas")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Vacuna {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String nombre;

    @Column(name = "enfermedad_prevenida")
    private String enfermedadPrevenida;

    // Días que no se puede vender/consumir leche o carne del animal tras aplicarla.
    @Column(name = "dias_retiro_leche", nullable = false)
    private Integer diasRetiroLeche = 0;

    @Column(name = "dias_retiro_carne", nullable = false)
    private Integer diasRetiroCarne = 0;

    // Días tras la aplicación en que corresponde una dosis de refuerzo (0 = dosis única).
    @Column(name = "dias_para_refuerzo")
    private Integer diasParaRefuerzo;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getEnfermedadPrevenida() { return enfermedadPrevenida; }
    public void setEnfermedadPrevenida(String enfermedadPrevenida) { this.enfermedadPrevenida = enfermedadPrevenida; }
    public Integer getDiasRetiroLeche() { return diasRetiroLeche; }
    public void setDiasRetiroLeche(Integer diasRetiroLeche) { this.diasRetiroLeche = diasRetiroLeche; }
    public Integer getDiasRetiroCarne() { return diasRetiroCarne; }
    public void setDiasRetiroCarne(Integer diasRetiroCarne) { this.diasRetiroCarne = diasRetiroCarne; }
    public Integer getDiasParaRefuerzo() { return diasParaRefuerzo; }
    public void setDiasParaRefuerzo(Integer diasParaRefuerzo) { this.diasParaRefuerzo = diasParaRefuerzo; }
}
