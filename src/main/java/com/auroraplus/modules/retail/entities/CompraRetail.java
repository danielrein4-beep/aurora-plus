package com.auroraplus.modules.retail.entities;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** Compra a proveedor de Aurora Retail — mismo patrón que CompraInsumoHoreca. */
@Entity
@Table(name = "compras_retail")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class CompraRetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    // EAGER a propósito (mismo criterio que Detalle*.articulo en todo el
    // proyecto): el Hibernate6Module global serializa cualquier relación LAZY
    // no inicializada como null en vez de cargarla — con LAZY acá, GET
    // /api/retail/compras devolvía "proveedor": null y tumbaba el frontend
    // que sí necesita mostrar el nombre del proveedor en la lista.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "proveedor_id", nullable = false)
    private ProveedorRetail proveedor;

    @Column(name = "numero_factura", nullable = false)
    private String numeroFactura;

    @Column(name = "fecha_compra", nullable = false)
    private LocalDateTime fechaCompra = LocalDateTime.now();

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(name = "monto_pagado", precision = 18, scale = 2)
    private BigDecimal montoPagado;

    @OneToMany(mappedBy = "compra", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<DetalleCompraRetail> items = new ArrayList<>();

    public void addItem(DetalleCompraRetail item) {
        items.add(item);
        item.setCompra(this);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public ProveedorRetail getProveedor() { return proveedor; }
    public void setProveedor(ProveedorRetail proveedor) { this.proveedor = proveedor; }
    public String getNumeroFactura() { return numeroFactura; }
    public void setNumeroFactura(String numeroFactura) { this.numeroFactura = numeroFactura; }
    public LocalDateTime getFechaCompra() { return fechaCompra; }
    public void setFechaCompra(LocalDateTime fechaCompra) { this.fechaCompra = fechaCompra; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public BigDecimal getMontoPagado() { return montoPagado; }
    public void setMontoPagado(BigDecimal montoPagado) { this.montoPagado = montoPagado; }
    public List<DetalleCompraRetail> getItems() { return items; }
    public void setItems(List<DetalleCompraRetail> items) { this.items = items; }
}
