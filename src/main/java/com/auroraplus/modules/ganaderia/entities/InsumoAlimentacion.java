package com.auroraplus.modules.ganaderia.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

/** Catálogo de insumos de alimentación (silos, fardos, balanceados, suplementos) con su stock actual. */
@Entity
@Table(name = "insumos_alimentacion")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class InsumoAlimentacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false, length = 30)
    private String tipo; // SILO, FARDO, BALANCEADO, SUPLEMENTO, SAL_MINERAL...

    @Column(nullable = false, length = 10)
    private String unidadMedida; // KG, TON, UNIDAD, LITRO

    @Column(name = "stock_actual", nullable = false, precision = 18, scale = 4)
    private BigDecimal stockActual = BigDecimal.ZERO;

    @Column(name = "costo_unitario", precision = 18, scale = 2)
    private BigDecimal costoUnitario = BigDecimal.ZERO;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public String getUnidadMedida() { return unidadMedida; }
    public void setUnidadMedida(String unidadMedida) { this.unidadMedida = unidadMedida; }
    public BigDecimal getStockActual() { return stockActual; }
    public void setStockActual(BigDecimal stockActual) { this.stockActual = stockActual; }
    public BigDecimal getCostoUnitario() { return costoUnitario; }
    public void setCostoUnitario(BigDecimal costoUnitario) { this.costoUnitario = costoUnitario; }
}
