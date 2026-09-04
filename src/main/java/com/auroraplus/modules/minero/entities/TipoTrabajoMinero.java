package com.auroraplus.modules.minero.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

/**
 * Catálogo de roles de destajo minero, cada uno con su propia tarifa: PICADOR,
 * CARRETERO, FRENTERO, TRABAJO_ROCA, NUEVO_FRENTE... — el picador y el
 * carretero suelen trabajar en pareja sobre la MISMA producción, pero cada
 * uno cobra a su propia tarifa (ver LiquidacionDestajo/DetalleLiquidacionDestajo).
 */
@Entity
@Table(name = "tipos_trabajo_minero")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class TipoTrabajoMinero {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false, length = 30)
    private String nombre; // PICADOR, CARRETERO, FRENTERO, TRABAJO_ROCA, NUEVO_FRENTE...

    @Column(name = "unidad_medida", nullable = false, length = 15)
    private String unidadMedida = "TONELADA"; // TONELADA, METRO (avance de frente)

    @Column(name = "tarifa_por_unidad", nullable = false, precision = 18, scale = 4)
    private BigDecimal tarifaPorUnidad;

    // Cada rol puede pagarse en su propia moneda — ej. picador a $5/tonelada,
    // carretero a 30.000 COP/tonelada, en la misma cuadrilla.
    @Column(nullable = false, length = 3)
    private String moneda = "USD";

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getUnidadMedida() { return unidadMedida; }
    public void setUnidadMedida(String unidadMedida) { this.unidadMedida = unidadMedida; }
    public BigDecimal getTarifaPorUnidad() { return tarifaPorUnidad; }
    public void setTarifaPorUnidad(BigDecimal tarifaPorUnidad) { this.tarifaPorUnidad = tarifaPorUnidad; }
    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }
}
