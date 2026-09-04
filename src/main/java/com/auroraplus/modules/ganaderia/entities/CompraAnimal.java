package com.auroraplus.modules.ganaderia.entities;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** Factura de compra de animales a un proveedor — cada ítem CREA un Animal nuevo en el hato (no es stock fungible). */
@Entity
@Table(name = "compras_animal")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class CompraAnimal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proveedor_id", nullable = false)
    private ProveedorGanaderia proveedor;

    @Column(name = "numero_factura", nullable = false)
    private String numeroFactura;

    @Column(name = "fecha_compra", nullable = false)
    private LocalDateTime fechaCompra = LocalDateTime.now();

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @OneToMany(mappedBy = "compra", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<DetalleCompraAnimal> items = new ArrayList<>();

    public void addItem(DetalleCompraAnimal item) {
        items.add(item);
        item.setCompra(this);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public ProveedorGanaderia getProveedor() { return proveedor; }
    public void setProveedor(ProveedorGanaderia proveedor) { this.proveedor = proveedor; }
    public String getNumeroFactura() { return numeroFactura; }
    public void setNumeroFactura(String numeroFactura) { this.numeroFactura = numeroFactura; }
    public LocalDateTime getFechaCompra() { return fechaCompra; }
    public void setFechaCompra(LocalDateTime fechaCompra) { this.fechaCompra = fechaCompra; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public List<DetalleCompraAnimal> getItems() { return items; }
    public void setItems(List<DetalleCompraAnimal> items) { this.items = items; }
}
