package com.auroraplus.modules.minero.entities;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

@Entity
@Table(name = "detalles_venta_mineral")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class DetalleVentaMineral {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venta_id")
    @JsonBackReference
    private VentaMineral venta;

    // Libre: GRANO, MENUDO, FINO, BRUTO — la clasificación de TransformacionMineral.
    @Column(nullable = false, length = 20)
    private String producto;

    // Opcional: si la venta es de GRANO/MENUDO/FINO ya clasificado, se puede
    // referenciar el lote exacto de TransformacionMineral del que sale, para que
    // el sistema valide y descuente el disponible real de ese lote (evita vender
    // más de lo que realmente se produjo). BRUTO vendido directo del frente, sin
    // pasar por zaranda, queda sin referencia — no aplica control de lote.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transformacion_id")
    private TransformacionMineral transformacion;

    @Column(nullable = false, precision = 18, scale = 4)
    private BigDecimal cantidad;

    @Column(name = "precio_unitario", nullable = false, precision = 18, scale = 2)
    private BigDecimal precioUnitario;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal subtotal;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public VentaMineral getVenta() { return venta; }
    public void setVenta(VentaMineral venta) { this.venta = venta; }
    public String getProducto() { return producto; }
    public void setProducto(String producto) { this.producto = producto; }
    public TransformacionMineral getTransformacion() { return transformacion; }
    public void setTransformacion(TransformacionMineral transformacion) { this.transformacion = transformacion; }
    public BigDecimal getCantidad() { return cantidad; }
    public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }
    public BigDecimal getPrecioUnitario() { return precioUnitario; }
    public void setPrecioUnitario(BigDecimal precioUnitario) { this.precioUnitario = precioUnitario; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
}
