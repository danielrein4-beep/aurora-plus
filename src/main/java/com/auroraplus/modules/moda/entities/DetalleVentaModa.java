package com.auroraplus.modules.moda.entities;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

@Entity
@Table(name = "detalles_venta_moda")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class DetalleVentaModa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venta_id")
    @JsonBackReference
    private VentaModa venta;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "variante_id", nullable = false)
    private VarianteModa variante;

    @Column(nullable = false, precision = 18, scale = 4)
    private BigDecimal cantidad;

    @Column(name = "precio_unitario", nullable = false, precision = 18, scale = 2)
    private BigDecimal precioUnitario;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal subtotal;

    // Costo CONGELADO al momento de la venta (docs/finance-contract.md §3.1) — mismo criterio
    // que items_venta_retail/items_comanda. Nullable a propósito y SIN backfill: las ventas
    // registradas antes de esta columna no tienen forma de saber su costo real de ese momento,
    // así que quedan en null en vez de rellenarse con el costo actual del producto (eso
    // falsificaría su margen histórico). Solo las ventas nuevas lo traen (ModaVentaService).
    @Column(name = "costo_unitario", precision = 18, scale = 4)
    private BigDecimal costoUnitario;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public VentaModa getVenta() { return venta; }
    public void setVenta(VentaModa venta) { this.venta = venta; }
    public VarianteModa getVariante() { return variante; }
    public void setVariante(VarianteModa variante) { this.variante = variante; }
    public BigDecimal getCantidad() { return cantidad; }
    public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }
    public BigDecimal getPrecioUnitario() { return precioUnitario; }
    public void setPrecioUnitario(BigDecimal precioUnitario) { this.precioUnitario = precioUnitario; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public BigDecimal getCostoUnitario() { return costoUnitario; }
    public void setCostoUnitario(BigDecimal costoUnitario) { this.costoUnitario = costoUnitario; }
}
