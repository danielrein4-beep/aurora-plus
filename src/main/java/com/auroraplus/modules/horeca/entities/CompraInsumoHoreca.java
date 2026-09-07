package com.auroraplus.modules.horeca.entities;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "compras_insumo_horeca")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class CompraInsumoHoreca {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proveedor_id", nullable = false)
    private ProveedorHoreca proveedor;

    @Column(name = "numero_factura", nullable = false)
    private String numeroFactura;

    @Column(name = "fecha_compra", nullable = false)
    private LocalDateTime fechaCompra = LocalDateTime.now();

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    // En moneda base del tenant, igual que `total`. Null/0 = no se pagó nada
    // al momento de la compra (factura entera a crédito). Cuando
    // montoPagado >= total, la factura está saldada; el saldo real siempre
    // vive en la cuenta por pagar (MovimientoCaja) vinculada, esto es solo
    // para mostrar de un vistazo "pagado X de Y" en la lista de compras.
    @Column(name = "monto_pagado", precision = 18, scale = 2)
    private BigDecimal montoPagado;

    @OneToMany(mappedBy = "compra", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<DetalleCompraInsumoHoreca> items = new ArrayList<>();

    public void addItem(DetalleCompraInsumoHoreca item) {
        items.add(item);
        item.setCompra(this);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public ProveedorHoreca getProveedor() { return proveedor; }
    public void setProveedor(ProveedorHoreca proveedor) { this.proveedor = proveedor; }
    public String getNumeroFactura() { return numeroFactura; }
    public void setNumeroFactura(String numeroFactura) { this.numeroFactura = numeroFactura; }
    public LocalDateTime getFechaCompra() { return fechaCompra; }
    public void setFechaCompra(LocalDateTime fechaCompra) { this.fechaCompra = fechaCompra; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public BigDecimal getMontoPagado() { return montoPagado; }
    public void setMontoPagado(BigDecimal montoPagado) { this.montoPagado = montoPagado; }
    public List<DetalleCompraInsumoHoreca> getItems() { return items; }
    public void setItems(List<DetalleCompraInsumoHoreca> items) { this.items = items; }
}
