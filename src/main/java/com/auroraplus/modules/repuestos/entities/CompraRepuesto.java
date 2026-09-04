package com.auroraplus.modules.repuestos.entities;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Factura de compra a un proveedor: encabezado de la entrada de mercancía
 * que sube el stock del catálogo de repuestos (lo que faltaba: antes solo
 * se podía vender, nunca "comprar" con registro).
 */
@Entity
@Table(name = "compras_repuesto")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class CompraRepuesto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proveedor_id", nullable = false)
    private ProveedorRepuesto proveedor;

    @Column(name = "numero_factura", nullable = false)
    private String numeroFactura;

    @Column(name = "fecha_compra", nullable = false)
    private LocalDateTime fechaCompra = LocalDateTime.now();

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @OneToMany(mappedBy = "compra", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<DetalleCompraRepuesto> items = new ArrayList<>();

    public void addItem(DetalleCompraRepuesto item) {
        items.add(item);
        item.setCompra(this);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public ProveedorRepuesto getProveedor() { return proveedor; }
    public void setProveedor(ProveedorRepuesto proveedor) { this.proveedor = proveedor; }
    public String getNumeroFactura() { return numeroFactura; }
    public void setNumeroFactura(String numeroFactura) { this.numeroFactura = numeroFactura; }
    public LocalDateTime getFechaCompra() { return fechaCompra; }
    public void setFechaCompra(LocalDateTime fechaCompra) { this.fechaCompra = fechaCompra; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public List<DetalleCompraRepuesto> getItems() { return items; }
    public void setItems(List<DetalleCompraRepuesto> items) { this.items = items; }
}
