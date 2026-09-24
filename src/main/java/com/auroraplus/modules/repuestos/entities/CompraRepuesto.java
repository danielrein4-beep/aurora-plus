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

    // Cuánto se le pagó de una vez al proveedor al registrar esta factura (null = nada
    // pagado, factura entera a crédito). El saldo (total - montoPagado) es lo que queda
    // como Cuenta por Pagar — ver RepuestoCompraService.registrarCompra.
    @Column(name = "monto_pagado", precision = 18, scale = 2)
    private BigDecimal montoPagado;

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
    public BigDecimal getMontoPagado() { return montoPagado; }
    public void setMontoPagado(BigDecimal montoPagado) { this.montoPagado = montoPagado; }
    public List<DetalleCompraRepuesto> getItems() { return items; }
    public void setItems(List<DetalleCompraRepuesto> items) { this.items = items; }

    // Datos fiscales de la factura del proveedor, para el libro de compras (V96).
    // Opcionales: una compra sin factura fiscal (nota de entrega) los deja vacíos.
    @Column(name = "numero_control", length = 30)
    private String numeroControl;
    @Column(name = "monto_exento", precision = 18, scale = 2)
    private BigDecimal montoExento;
    @Column(name = "base_imponible", precision = 18, scale = 2)
    private BigDecimal baseImponible;
    @Column(name = "alicuota_iva", precision = 5, scale = 2)
    private BigDecimal alicuotaIva;
    @Column(name = "monto_iva", precision = 18, scale = 2)
    private BigDecimal montoIva;
    @Column(name = "iva_retenido", precision = 18, scale = 2)
    private BigDecimal ivaRetenido;
    @Column(name = "tasa_bcv", precision = 18, scale = 6)
    private BigDecimal tasaBcv;

    public String getNumeroControl() { return numeroControl; }
    public void setNumeroControl(String numeroControl) { this.numeroControl = numeroControl; }
    public BigDecimal getMontoExento() { return montoExento; }
    public void setMontoExento(BigDecimal montoExento) { this.montoExento = montoExento; }
    public BigDecimal getBaseImponible() { return baseImponible; }
    public void setBaseImponible(BigDecimal baseImponible) { this.baseImponible = baseImponible; }
    public BigDecimal getAlicuotaIva() { return alicuotaIva; }
    public void setAlicuotaIva(BigDecimal alicuotaIva) { this.alicuotaIva = alicuotaIva; }
    public BigDecimal getMontoIva() { return montoIva; }
    public void setMontoIva(BigDecimal montoIva) { this.montoIva = montoIva; }
    public BigDecimal getIvaRetenido() { return ivaRetenido; }
    public void setIvaRetenido(BigDecimal ivaRetenido) { this.ivaRetenido = ivaRetenido; }
    public BigDecimal getTasaBcv() { return tasaBcv; }
    public void setTasaBcv(BigDecimal tasaBcv) { this.tasaBcv = tasaBcv; }
}
