package com.auroraplus.core.inventario.entities;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

@Entity
@Table(name = "detalles_conteo_fisico")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class DetalleConteoFisico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conteo_id")
    @JsonBackReference
    private ConteoFisico conteo;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "articulo_id", nullable = false)
    private Articulo articulo;

    // Snapshot del stock del sistema al momento de registrar el conteo de ESTE
    // artículo — no se muestra al responsable antes de que cuente (conteo ciego).
    @Column(name = "stock_teorico", nullable = false, precision = 18, scale = 4)
    private BigDecimal stockTeorico;

    @Column(name = "stock_fisico_contado", nullable = false, precision = 18, scale = 4)
    private BigDecimal stockFisicoContado;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public ConteoFisico getConteo() { return conteo; }
    public void setConteo(ConteoFisico conteo) { this.conteo = conteo; }
    public Articulo getArticulo() { return articulo; }
    public void setArticulo(Articulo articulo) { this.articulo = articulo; }
    public BigDecimal getStockTeorico() { return stockTeorico; }
    public void setStockTeorico(BigDecimal stockTeorico) { this.stockTeorico = stockTeorico; }
    public BigDecimal getStockFisicoContado() { return stockFisicoContado; }
    public void setStockFisicoContado(BigDecimal stockFisicoContado) { this.stockFisicoContado = stockFisicoContado; }

    @Transient
    public BigDecimal getBrecha() {
        if (stockTeorico == null || stockFisicoContado == null) return null;
        return stockFisicoContado.subtract(stockTeorico);
    }
}
