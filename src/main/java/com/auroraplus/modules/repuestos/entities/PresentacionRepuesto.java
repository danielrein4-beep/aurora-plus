package com.auroraplus.modules.repuestos.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

/**
 * Presentación de venta de un repuesto (caja, unidad individual, metro, kilo, etc.),
 * cada una con su propio factor de conversión hacia la unidad base de inventario
 * (la que usa RepuestoItem.stockActual) y su propio precio de venta.
 */
@Entity
@Table(name = "presentaciones_repuesto")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class PresentacionRepuesto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repuesto_id", nullable = false)
    private RepuestoItem repuesto;

    @Column(name = "nombre_presentacion", nullable = false, length = 30)
    private String nombrePresentacion; // Ej: CAJA, UNIDAD, METRO, KILOGRAMO

    @Column(name = "factor_conversion", nullable = false, precision = 18, scale = 6)
    private BigDecimal factorConversion; // Cuántas unidades base equivale 1 de esta presentación

    @Column(name = "precio_venta", nullable = false, precision = 18, scale = 2)
    private BigDecimal precioVenta;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public RepuestoItem getRepuesto() { return repuesto; }
    public void setRepuesto(RepuestoItem repuesto) { this.repuesto = repuesto; }
    public String getNombrePresentacion() { return nombrePresentacion; }
    public void setNombrePresentacion(String nombrePresentacion) { this.nombrePresentacion = nombrePresentacion; }
    public BigDecimal getFactorConversion() { return factorConversion; }
    public void setFactorConversion(BigDecimal factorConversion) { this.factorConversion = factorConversion; }
    public BigDecimal getPrecioVenta() { return precioVenta; }
    public void setPrecioVenta(BigDecimal precioVenta) { this.precioVenta = precioVenta; }
}
