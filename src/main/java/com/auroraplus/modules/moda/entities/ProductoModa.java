package com.auroraplus.modules.moda.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Producto padre de la matriz dimensional (Subfase 6.1): un mismo modelo de
 * ropa/calzado agrupa muchas variantes (Talla x Color) bajo un único SKU
 * padre, cada variante con su propio stock y código de barras — ver
 * {@link VarianteModa}.
 */
@Entity
@Table(name = "productos_moda")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class ProductoModa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "codigo_sku_padre", nullable = false, length = 50)
    private String codigoSkuPadre;

    @Column(nullable = false)
    private String nombre;

    private String categoria;

    private String marca;

    @Column(name = "precio_venta", nullable = false, precision = 18, scale = 2)
    private BigDecimal precioVenta;

    // Costo de la última compra registrada — igual que en repuestos, sirve
    // para mostrar la utilidad real al momento de fijar el precio de venta.
    @Column(name = "costo_unitario", precision = 18, scale = 2)
    private BigDecimal costoUnitario = BigDecimal.ZERO;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getCodigoSkuPadre() { return codigoSkuPadre; }
    public void setCodigoSkuPadre(String codigoSkuPadre) { this.codigoSkuPadre = codigoSkuPadre; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public String getMarca() { return marca; }
    public void setMarca(String marca) { this.marca = marca; }
    public BigDecimal getPrecioVenta() { return precioVenta; }
    public void setPrecioVenta(BigDecimal precioVenta) { this.precioVenta = precioVenta; }
    public BigDecimal getCostoUnitario() { return costoUnitario; }
    public void setCostoUnitario(BigDecimal costoUnitario) { this.costoUnitario = costoUnitario; }

    @Transient
    public BigDecimal getUtilidadUnitaria() {
        if (precioVenta == null || costoUnitario == null) return null;
        return precioVenta.subtract(costoUnitario);
    }

    @Transient
    public BigDecimal getUtilidadPorcentual() {
        BigDecimal utilidad = getUtilidadUnitaria();
        if (utilidad == null || costoUnitario == null || costoUnitario.compareTo(BigDecimal.ZERO) == 0) return null;
        return utilidad.divide(costoUnitario, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
    }
}
