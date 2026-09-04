package com.auroraplus.modules.tamanacocomercial.entities;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

@Entity
@Table(name = "detalles_venta_comercial")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class DetalleVentaComercial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venta_id")
    @JsonBackReference
    private VentaComercial venta;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "producto_id", nullable = false)
    private ProductoComercial producto;

    @Column(name = "nombre_producto")
    private String nombreProducto;

    private String tamano;

    @Column(nullable = false, precision = 18, scale = 4)
    private BigDecimal cantidad;

    @Column(name = "precio_unitario_usd", nullable = false, precision = 18, scale = 2)
    private BigDecimal precioUnitarioUsd;

    @Column(name = "subtotal_usd", nullable = false, precision = 18, scale = 2)
    private BigDecimal subtotalUsd;

    public DetalleVentaComercial() {}

    public DetalleVentaComercial(ProductoComercial producto, BigDecimal cantidad, BigDecimal precioUnitarioUsd) {
        this.producto = producto;
        this.cantidad = cantidad;
        this.precioUnitarioUsd = precioUnitarioUsd;
        this.subtotalUsd = (precioUnitarioUsd != null && cantidad != null)
            ? precioUnitarioUsd.multiply(cantidad) : BigDecimal.ZERO;
        if (producto != null) {
            this.nombreProducto = producto.getNombre();
            this.tamano = producto.getTamano();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public VentaComercial getVenta() { return venta; }
    public void setVenta(VentaComercial venta) { this.venta = venta; }
    public ProductoComercial getProducto() { return producto; }
    public void setProducto(ProductoComercial producto) { this.producto = producto; }
    public String getNombreProducto() { return nombreProducto; }
    public void setNombreProducto(String nombreProducto) { this.nombreProducto = nombreProducto; }
    public String getTamano() { return tamano; }
    public void setTamano(String tamano) { this.tamano = tamano; }
    public BigDecimal getCantidad() { return cantidad; }
    public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }
    public BigDecimal getPrecioUnitarioUsd() { return precioUnitarioUsd; }
    public void setPrecioUnitarioUsd(BigDecimal precioUnitarioUsd) { this.precioUnitarioUsd = precioUnitarioUsd; }
    public BigDecimal getSubtotalUsd() { return subtotalUsd; }
    public void setSubtotalUsd(BigDecimal subtotalUsd) { this.subtotalUsd = subtotalUsd; }
}
