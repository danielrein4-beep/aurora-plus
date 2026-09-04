package com.auroraplus.modules.moda.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

/**
 * Variante concreta de un {@link ProductoModa}: la combinación Talla+Color es
 * la unidad real de stock e identificación en el punto de venta (código de
 * barras propio para el lector — Subfase 6.2).
 */
@Entity
@Table(name = "variantes_moda", indexes = {
    @Index(name = "idx_variante_tenant_barras", columnList = "tenant_id, codigo_barras")
})
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class VarianteModa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "producto_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private ProductoModa producto;

    @Column(nullable = false, length = 20)
    private String talla;

    @Column(nullable = false, length = 40)
    private String color;

    @Column(name = "codigo_barras", nullable = false, unique = true, length = 30)
    private String codigoBarras;

    @Column(name = "stock_actual", nullable = false, precision = 18, scale = 4)
    private BigDecimal stockActual = BigDecimal.ZERO;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public ProductoModa getProducto() { return producto; }
    public void setProducto(ProductoModa producto) { this.producto = producto; }
    public String getTalla() { return talla; }
    public void setTalla(String talla) { this.talla = talla; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public String getCodigoBarras() { return codigoBarras; }
    public void setCodigoBarras(String codigoBarras) { this.codigoBarras = codigoBarras; }
    public BigDecimal getStockActual() { return stockActual; }
    public void setStockActual(BigDecimal stockActual) { this.stockActual = stockActual; }
}
