package com.auroraplus.modules.tamanacocomercial.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Análisis de calidad del carbón, con penalización automática por ceniza
 * (misma regla de negocio del sistema original): >10% penaliza, >15% es crítico.
 */
@Entity
@Table(name = "analisis_laboratorio_comercial")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class AnalisisLaboratorio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String mina;

    @Column(name = "fecha_muestra")
    private LocalDate fechaMuestra;

    @Column(name = "fecha_analisis")
    private LocalDate fechaAnalisis;

    private String lote;

    private BigDecimal humedad;
    private BigDecimal ceniza;
    private BigDecimal azufre;

    @Column(name = "poder_calorifico")
    private BigDecimal poderCalorifico;

    private String estado; // APROBADO, PENALIZADO, RECHAZADO

    @Column(name = "estado_penalizacion")
    private String estadoPenalizacion;

    @Column(name = "descuento_aplicado", precision = 18, scale = 2)
    private BigDecimal descuentoAplicado;

    private String observacion;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /** Recalcula el estado y descuento aplicado según el % de ceniza. */
    public void aplicarReglaPenalizacion() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (ceniza == null) {
            estado = "APROBADO";
            estadoPenalizacion = "NORMAL";
            descuentoAplicado = BigDecimal.ZERO;
            return;
        }
        if (ceniza.compareTo(new BigDecimal("10.0")) <= 0) {
            estado = "APROBADO";
            estadoPenalizacion = "NORMAL";
            descuentoAplicado = BigDecimal.ZERO;
        } else if (ceniza.compareTo(new BigDecimal("15.0")) <= 0) {
            estado = "PENALIZADO";
            estadoPenalizacion = "PENALIZADO";
            descuentoAplicado = new BigDecimal("10000.00");
            if (observacion == null || observacion.isBlank()) {
                observacion = "Penalizado: Ceniza " + ceniza + "% (>10%)";
            }
        } else {
            estado = "PENALIZADO";
            estadoPenalizacion = "CRITICO";
            descuentoAplicado = new BigDecimal("10000.00");
            if (observacion == null || observacion.isBlank()) {
                observacion = "Crítico: Ceniza " + ceniza + "% (>15%)";
            }
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getMina() { return mina; }
    public void setMina(String mina) { this.mina = mina != null ? mina.trim().toUpperCase() : null; }
    public LocalDate getFechaMuestra() { return fechaMuestra; }
    public void setFechaMuestra(LocalDate fechaMuestra) { this.fechaMuestra = fechaMuestra; }
    public LocalDate getFechaAnalisis() { return fechaAnalisis; }
    public void setFechaAnalisis(LocalDate fechaAnalisis) { this.fechaAnalisis = fechaAnalisis; }
    public String getLote() { return lote; }
    public void setLote(String lote) { this.lote = lote; }
    public BigDecimal getHumedad() { return humedad; }
    public void setHumedad(BigDecimal humedad) { this.humedad = humedad; }
    public BigDecimal getCeniza() { return ceniza; }
    public void setCeniza(BigDecimal ceniza) { this.ceniza = ceniza; }
    public BigDecimal getAzufre() { return azufre; }
    public void setAzufre(BigDecimal azufre) { this.azufre = azufre; }
    public BigDecimal getPoderCalorifico() { return poderCalorifico; }
    public void setPoderCalorifico(BigDecimal poderCalorifico) { this.poderCalorifico = poderCalorifico; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public String getEstadoPenalizacion() { return estadoPenalizacion != null ? estadoPenalizacion : estado; }
    public void setEstadoPenalizacion(String estadoPenalizacion) { this.estadoPenalizacion = estadoPenalizacion; }
    public BigDecimal getDescuentoAplicado() { return descuentoAplicado; }
    public void setDescuentoAplicado(BigDecimal descuentoAplicado) { this.descuentoAplicado = descuentoAplicado; }
    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) { this.observacion = observacion; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
