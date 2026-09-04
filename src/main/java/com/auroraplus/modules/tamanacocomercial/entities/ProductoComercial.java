package com.auroraplus.modules.tamanacocomercial.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Catálogo comercial (grados de carbón u otros productos comercializados),
 * adaptado del catálogo genérico "Producto" del proyecto "inventario".
 */
@Entity
@Table(name = "productos_comerciales")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class ProductoComercial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false, length = 50)
    private String codigo;

    @Column(nullable = false)
    private String nombre;

    private String descripcion;

    @Column(nullable = false)
    private String categoria; // Ej: GRANO, MENUDO, FINO

    private String tamano; // Ej: INDIVIDUAL, COMPARTIR, ESTANDAR

    @Column(name = "unidad_medida", nullable = false, length = 20)
    private String unidadMedida;

    @Column(name = "precio_usd", nullable = false, precision = 18, scale = 2)
    private BigDecimal precioUsd;

    @Column(name = "precio_cop_fijo", precision = 18, scale = 2)
    private BigDecimal precioCopFijo;

    @Column(name = "stock_minimo", precision = 18, scale = 4)
    private BigDecimal stockMinimo = BigDecimal.ZERO;

    @Column(name = "stock_actual", nullable = false, precision = 18, scale = 4)
    private BigDecimal stockActual = BigDecimal.ZERO;

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public String getTamano() { return tamano; }
    public void setTamano(String tamano) { this.tamano = tamano; }
    public String getUnidadMedida() { return unidadMedida; }
    public void setUnidadMedida(String unidadMedida) { this.unidadMedida = unidadMedida; }
    public BigDecimal getPrecioUsd() { return precioUsd; }
    public void setPrecioUsd(BigDecimal precioUsd) { this.precioUsd = precioUsd; }
    public BigDecimal getPrecioCopFijo() { return precioCopFijo; }
    public void setPrecioCopFijo(BigDecimal precioCopFijo) { this.precioCopFijo = precioCopFijo; }
    public BigDecimal getStockMinimo() { return stockMinimo; }
    public void setStockMinimo(BigDecimal stockMinimo) { this.stockMinimo = stockMinimo; }
    public BigDecimal getStockActual() { return stockActual; }
    public void setStockActual(BigDecimal stockActual) { this.stockActual = stockActual; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
