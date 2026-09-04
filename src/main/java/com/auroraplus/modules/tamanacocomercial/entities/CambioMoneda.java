package com.auroraplus.modules.tamanacocomercial.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Registro de conversiones entre monedas dentro de Tesorería comercial.
 * montoOrigen sale de la caja en monedaOrigen; montoDestino entra en monedaDestino.
 */
@Entity
@Table(name = "cambios_moneda_comercial")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class CambioMoneda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private LocalDate fecha = LocalDate.now();

    @Column(name = "moneda_origen", nullable = false)
    private String monedaOrigen;

    @Column(name = "monto_origen", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoOrigen;

    @Column(name = "moneda_destino", nullable = false)
    private String monedaDestino;

    @Column(name = "monto_destino", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoDestino;

    @Column(name = "tasa_cambio", precision = 18, scale = 6)
    private BigDecimal tasaCambio;

    private String concepto;
    private String referencia;

    @Column(length = 1000)
    private String notas;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha != null ? fecha : LocalDate.now(); }
    public String getMonedaOrigen() { return monedaOrigen; }
    public void setMonedaOrigen(String monedaOrigen) { this.monedaOrigen = monedaOrigen; }
    public BigDecimal getMontoOrigen() { return montoOrigen; }
    public void setMontoOrigen(BigDecimal montoOrigen) { this.montoOrigen = montoOrigen; }
    public String getMonedaDestino() { return monedaDestino; }
    public void setMonedaDestino(String monedaDestino) { this.monedaDestino = monedaDestino; }
    public BigDecimal getMontoDestino() { return montoDestino; }
    public void setMontoDestino(BigDecimal montoDestino) { this.montoDestino = montoDestino; }
    public BigDecimal getTasaCambio() { return tasaCambio; }
    public void setTasaCambio(BigDecimal tasaCambio) { this.tasaCambio = tasaCambio; }
    public String getConcepto() { return concepto; }
    public void setConcepto(String concepto) { this.concepto = concepto; }
    public String getReferencia() { return referencia; }
    public void setReferencia(String referencia) { this.referencia = referencia; }
    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
