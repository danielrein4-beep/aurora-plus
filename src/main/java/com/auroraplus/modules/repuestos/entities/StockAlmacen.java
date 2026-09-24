package com.auroraplus.modules.repuestos.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

/**
 * Cuánto de un RepuestoItem vive en un Almacen específico. La suma de todas
 * las filas de un mismo repuesto debe coincidir con RepuestoItem.stockActual
 * — se mantiene así porque el único lugar donde estas filas cambian es
 * AlmacenService (crear/trasladar), nunca el flujo de venta/compra, que
 * sigue moviendo solo el total.
 */
@Entity
@Table(name = "stock_almacen", uniqueConstraints = @UniqueConstraint(columnNames = {"almacen_id", "repuesto_id"}))
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class StockAlmacen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "almacen_id", nullable = false)
    private Long almacenId;

    @Column(name = "repuesto_id", nullable = false)
    private Long repuestoId;

    @Column(nullable = false, precision = 18, scale = 4)
    private BigDecimal cantidad = BigDecimal.ZERO;

    // Posición física dentro de ESTE almacén (ej. "Pasillo 3, Estante B") — por almacén y no
    // por producto porque el mismo artículo puede estar en lugares distintos en cada ubicación.
    @Column(length = 120)
    private String ubicacion;

    public String getUbicacion() { return ubicacion; }
    public void setUbicacion(String ubicacion) { this.ubicacion = ubicacion; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Long getAlmacenId() { return almacenId; }
    public void setAlmacenId(Long almacenId) { this.almacenId = almacenId; }
    public Long getRepuestoId() { return repuestoId; }
    public void setRepuestoId(Long repuestoId) { this.repuestoId = repuestoId; }
    public BigDecimal getCantidad() { return cantidad; }
    public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }
}
