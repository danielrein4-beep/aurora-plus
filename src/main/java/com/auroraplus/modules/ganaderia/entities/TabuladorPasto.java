package com.auroraplus.modules.ganaderia.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

/**
 * Tabulador de referencia de manejo de pastoreo, EDITABLE por cada tenant —
 * cada negocio parte de valores generales de referencia (ver
 * ReferenciaPastoreoService.sembrarValoresPorDefecto) pero puede ajustarlos
 * con su propia experiencia real de terreno (lluvia, altura, suelo), sin
 * necesitar que nadie cambie código para eso.
 */
@Entity
@Table(name = "tabulador_pasto")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class TabuladorPasto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String nombre; // ej. "Brachiaria", "Estrella"...

    @Column(name = "animales_por_hectarea", nullable = false, precision = 6, scale = 2)
    private BigDecimal animalesPorHectarea;

    @Column(name = "dias_descanso_recomendado", nullable = false)
    private Integer diasDescansoRecomendado;

    // La fila genérica (esGenerico=true) es el respaldo cuando el tipoPasto del potrero no
    // coincide con ninguna fila de este tabulador — cada tenant debe tener EXACTAMENTE una.
    @Column(name = "es_generico", nullable = false)
    private boolean esGenerico = false;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public BigDecimal getAnimalesPorHectarea() { return animalesPorHectarea; }
    public void setAnimalesPorHectarea(BigDecimal animalesPorHectarea) { this.animalesPorHectarea = animalesPorHectarea; }
    public Integer getDiasDescansoRecomendado() { return diasDescansoRecomendado; }
    public void setDiasDescansoRecomendado(Integer diasDescansoRecomendado) { this.diasDescansoRecomendado = diasDescansoRecomendado; }
    public boolean isEsGenerico() { return esGenerico; }
    public void setEsGenerico(boolean esGenerico) { this.esGenerico = esGenerico; }
}
