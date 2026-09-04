package com.auroraplus.modules.repuestos.entities;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

@Entity
@Table(name = "detalles_compra_repuesto")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class DetalleCompraRepuesto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "compra_id")
    @JsonBackReference
    private CompraRepuesto compra;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "repuesto_id", nullable = false)
    private RepuestoItem repuesto;

    @Column(nullable = false, precision = 18, scale = 4)
    private BigDecimal cantidad;

    @Column(name = "costo_unitario", nullable = false, precision = 18, scale = 2)
    private BigDecimal costoUnitario;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal subtotal;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public CompraRepuesto getCompra() { return compra; }
    public void setCompra(CompraRepuesto compra) { this.compra = compra; }
    public RepuestoItem getRepuesto() { return repuesto; }
    public void setRepuesto(RepuestoItem repuesto) { this.repuesto = repuesto; }
    public BigDecimal getCantidad() { return cantidad; }
    public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }
    public BigDecimal getCostoUnitario() { return costoUnitario; }
    public void setCostoUnitario(BigDecimal costoUnitario) { this.costoUnitario = costoUnitario; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
}
