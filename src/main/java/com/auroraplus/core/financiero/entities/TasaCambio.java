package com.auroraplus.core.financiero.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Tasa de cambio entre dos monedas, con historial (nunca se sobreescribe, se
 * inserta una fila nueva cada vez que se actualiza — así se puede auditar la
 * fluctuación). Retrofit multi-tenant (2026-09-03): esta entidad venía de la
 * Fase 1.2 original, construida antes del motor multi-tenant de la Fase 2 —
 * le faltaba tenantId, así que cada tenant veía las tasas de todos los demás.
 */
@Entity
@Table(name = "tasas_cambio")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class TasaCambio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "moneda_origen", nullable = false, length = 3)
    private String monedaOrigen; // Ej: USD

    @Column(name = "moneda_destino", nullable = false, length = 3)
    private String monedaDestino; // Ej: VES, COP

    @Column(nullable = false, precision = 18, scale = 6)
    private BigDecimal tasa;

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion = LocalDateTime.now();

    @Column(name = "origen_api")
    private String origenApi = "MANUAL"; // Ej: BCV, TRM, MANUAL

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getMonedaOrigen() { return monedaOrigen; }
    public void setMonedaOrigen(String monedaOrigen) { this.monedaOrigen = monedaOrigen; }
    public String getMonedaDestino() { return monedaDestino; }
    public void setMonedaDestino(String monedaDestino) { this.monedaDestino = monedaDestino; }
    public BigDecimal getTasa() { return tasa; }
    public void setTasa(BigDecimal tasa) { this.tasa = tasa; }
    public LocalDateTime getFechaActualizacion() { return fechaActualizacion; }
    public void setFechaActualizacion(LocalDateTime fechaActualizacion) { this.fechaActualizacion = fechaActualizacion; }
    public String getOrigenApi() { return origenApi; }
    public void setOrigenApi(String origenApi) { this.origenApi = origenApi; }
}
