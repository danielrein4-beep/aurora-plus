package com.auroraplus.modules.horeca.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

@Entity
@Table(name = "escandallos_receta")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class EscandalloReceta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "nombre_plato", nullable = false)
    private String nombrePlato;

    // Se recalcula dinámicamente desde el costo actual de cada ingrediente
    // (ver EscandalloService.recalcularCosto) — no es un valor fijo: si el
    // proveedor sube el precio de la carne, este campo se actualiza solo la
    // próxima vez que se registre una venta o se llame al recálculo manual.
    @Column(name = "costo_total_produccion", nullable = false, precision = 18, scale = 2)
    private BigDecimal costoTotalProduccion = BigDecimal.ZERO;

    @Column(name = "estacion_cocina", nullable = false)
    private String estacionCocina = "COCINA"; // PARRILLA, BAR, COCINA_FRIA...

    @Column(name = "precio_venta", precision = 18, scale = 2)
    private BigDecimal precioVenta;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombrePlato() { return nombrePlato; }
    public void setNombrePlato(String nombrePlato) { this.nombrePlato = nombrePlato; }
    public BigDecimal getCostoTotalProduccion() { return costoTotalProduccion; }
    public void setCostoTotalProduccion(BigDecimal costoTotalProduccion) { this.costoTotalProduccion = costoTotalProduccion; }
    public String getEstacionCocina() { return estacionCocina; }
    public void setEstacionCocina(String estacionCocina) { this.estacionCocina = estacionCocina; }
    public BigDecimal getPrecioVenta() { return precioVenta; }
    public void setPrecioVenta(BigDecimal precioVenta) { this.precioVenta = precioVenta; }

    @Transient
    public BigDecimal getMargenContribucion() {
        if (precioVenta == null || costoTotalProduccion == null) return null;
        return precioVenta.subtract(costoTotalProduccion);
    }
}
