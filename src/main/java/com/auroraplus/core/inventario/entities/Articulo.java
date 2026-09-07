package com.auroraplus.core.inventario.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

@Entity
@Table(name = "articulos")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Articulo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false, length = 50)
    private String sku;

    @Column(nullable = false)
    private String nombre;

    @Column(name = "unidad_medida", nullable = false, length = 20)
    private String unidadMedida;

    @Column(nullable = false)
    private String categoria;

    @Column(name = "porcentaje_impuesto", nullable = false, precision = 5, scale = 2)
    private BigDecimal porcentajeImpuesto;

    @Column(name = "stock_actual", nullable = false, precision = 18, scale = 4)
    private BigDecimal stockActual = BigDecimal.ZERO;

    // Escala 4 (no 2): el costeo por gramos/ml (Horeca) trabaja con fracciones de
    // centavo por unidad (ej. $0.012/gramo en carne comprada a granel) — con solo
    // 2 decimales, ese costo se redondeaba a $0.01 y el escandallo quedaba mal
    // calculado en cualquier ingrediente barato comprado en bulto.
    @Column(name = "costo_unitario", nullable = false, precision = 18, scale = 4)
    private BigDecimal costoUnitario = BigDecimal.ZERO;

    // Precio al que se vende (distinto del costo) — columnDefinition con default
    // porque la tabla ya tiene filas: sin esto, Hibernate falla en silencio al
    // agregar una columna NOT NULL a una tabla no vacía (ddl-auto=update).
    @Column(name = "precio_venta", nullable = false, precision = 18, scale = 4, columnDefinition = "numeric(18,4) default 0")
    private BigDecimal precioVenta = BigDecimal.ZERO;

    // Umbral para alertas de reposición — null significa "sin alerta configurada".
    @Column(name = "stock_minimo", precision = 18, scale = 4)
    private BigDecimal stockMinimo;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getUnidadMedida() { return unidadMedida; }
    public void setUnidadMedida(String unidadMedida) { this.unidadMedida = unidadMedida; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public BigDecimal getPorcentajeImpuesto() { return porcentajeImpuesto; }
    public void setPorcentajeImpuesto(BigDecimal porcentajeImpuesto) { this.porcentajeImpuesto = porcentajeImpuesto; }
    public BigDecimal getStockActual() { return stockActual; }
    public void setStockActual(BigDecimal stockActual) { this.stockActual = stockActual; }
    public BigDecimal getCostoUnitario() { return costoUnitario; }
    public void setCostoUnitario(BigDecimal costoUnitario) { this.costoUnitario = costoUnitario; }
    public BigDecimal getPrecioVenta() { return precioVenta; }
    public void setPrecioVenta(BigDecimal precioVenta) { this.precioVenta = precioVenta; }
    public BigDecimal getStockMinimo() { return stockMinimo; }
    public void setStockMinimo(BigDecimal stockMinimo) { this.stockMinimo = stockMinimo; }

    @Transient
    public boolean isStockBajoMinimo() {
        return stockMinimo != null && stockActual.compareTo(stockMinimo) < 0;
    }

    /** Margen de utilidad bruta % = (precio - costo) / precio * 100 — null si no hay precio de venta cargado. */
    @Transient
    public BigDecimal getMargenUtilidad() {
        if (precioVenta == null || precioVenta.compareTo(BigDecimal.ZERO) <= 0) return null;
        BigDecimal costo = costoUnitario != null ? costoUnitario : BigDecimal.ZERO;
        return precioVenta.subtract(costo).divide(precioVenta, 4, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
    }
}
