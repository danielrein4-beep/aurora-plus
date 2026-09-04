package com.auroraplus.modules.horeca.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

/**
 * Línea de ingrediente de una receta: apunta a UN artículo de inventario
 * directo (ingredienteSku) O a otra receta como sub-receta (subReceta) —
 * exactamente uno de los dos, nunca ambos. Las sub-recetas permiten costear
 * preparaciones base (salsas, masas, fondos) por separado y reutilizarlas
 * dentro de platos finales, con la explosión de inventario propagándose en
 * cascada hasta los artículos reales (ver EscandalloService).
 */
@Entity
@Table(name = "detalles_receta")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class DetalleReceta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "escandallo_id", nullable = false)
    private EscandalloReceta escandallo;

    @Column(name = "ingrediente_sku")
    private String ingredienteSku;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sub_receta_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private EscandalloReceta subReceta;

    // Cantidad BRUTA a descontar de inventario (o, si es sub-receta, cuántas
    // "unidades" de esa sub-receta consume este plato) — gramos/ml/unidades
    // según el caso.
    @Column(name = "cantidad_requerida", nullable = false, precision = 18, scale = 4)
    private BigDecimal cantidadRequerida;

    // Mermas (Motor de Recetas — "peso bruto vs neto"): opcional. Si se
    // informan, cantidadRequerida (bruto, lo que sale de inventario) se
    // calcula como pesoNeto / (1 - porcentajeMerma/100) al registrar el
    // ingrediente — ej. 100g netos de filete con 20% de merma de limpieza
    // exigen comprar/descontar 125g brutos.
    @Column(name = "peso_neto", precision = 18, scale = 4)
    private BigDecimal pesoNeto;

    @Column(name = "porcentaje_merma", precision = 5, scale = 2)
    private BigDecimal porcentajeMerma;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public EscandalloReceta getEscandallo() { return escandallo; }
    public void setEscandallo(EscandalloReceta escandallo) { this.escandallo = escandallo; }
    public String getIngredienteSku() { return ingredienteSku; }
    public void setIngredienteSku(String ingredienteSku) { this.ingredienteSku = ingredienteSku; }
    public EscandalloReceta getSubReceta() { return subReceta; }
    public void setSubReceta(EscandalloReceta subReceta) { this.subReceta = subReceta; }
    public BigDecimal getCantidadRequerida() { return cantidadRequerida; }
    public void setCantidadRequerida(BigDecimal cantidadRequerida) { this.cantidadRequerida = cantidadRequerida; }
    public BigDecimal getPesoNeto() { return pesoNeto; }
    public void setPesoNeto(BigDecimal pesoNeto) { this.pesoNeto = pesoNeto; }
    public BigDecimal getPorcentajeMerma() { return porcentajeMerma; }
    public void setPorcentajeMerma(BigDecimal porcentajeMerma) { this.porcentajeMerma = porcentajeMerma; }
}
