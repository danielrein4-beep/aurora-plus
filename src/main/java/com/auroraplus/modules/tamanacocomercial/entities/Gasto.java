package com.auroraplus.modules.tamanacocomercial.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "gastos_comercial")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Gasto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false)
    private String categoria;

    @Column(nullable = false)
    private String descripcion;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal monto;

    @Column(name = "metodo_pago", nullable = false)
    private String metodoPago;

    @Column(nullable = false, length = 3)
    private String moneda = "COP"; // COP, USD, VES

    // FLETES_TRANSPORTE, OPERATIVO_PATIO, ADMINISTRATIVO_PERSONAL
    @Column(name = "tipo_gasto")
    private String tipoGasto = "OPERATIVO_PATIO";

    @Column(name = "mina_asociada")
    private String minaAsociada;

    @Column(nullable = false)
    private Boolean descontado = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "recibo_url", length = 500)
    private String reciboUrl;

    @Column(name = "tasa_cambio_usd", precision = 18, scale = 6)
    private BigDecimal tasaCambioUsd;

    @Column(name = "monto_usd", precision = 18, scale = 2)
    private BigDecimal montoUsd;

    /** Recalcula montoUsd a partir de monto + moneda + tasaCambioUsd. */
    public void recalcularMontoUsd() {
        if (monto == null) {
            this.montoUsd = BigDecimal.ZERO;
            return;
        }
        if ("USD".equalsIgnoreCase(moneda)) {
            this.montoUsd = monto;
        } else if (tasaCambioUsd != null && tasaCambioUsd.compareTo(BigDecimal.ZERO) > 0) {
            this.montoUsd = monto.divide(tasaCambioUsd, 2, RoundingMode.HALF_UP);
        } else {
            this.montoUsd = BigDecimal.ZERO;
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }
    public String getMoneda() { return moneda != null ? moneda : "COP"; }
    public void setMoneda(String moneda) { this.moneda = (moneda != null && !moneda.isEmpty()) ? moneda : "COP"; }
    public String getTipoGasto() { return tipoGasto != null ? tipoGasto : "OPERATIVO_PATIO"; }
    public void setTipoGasto(String tipoGasto) { this.tipoGasto = (tipoGasto != null && !tipoGasto.isBlank()) ? tipoGasto : "OPERATIVO_PATIO"; }
    public String getMinaAsociada() { return minaAsociada; }
    public void setMinaAsociada(String minaAsociada) { this.minaAsociada = minaAsociada != null ? minaAsociada.trim().toUpperCase() : null; }
    public Boolean getDescontado() { return descontado != null ? descontado : false; }
    public void setDescontado(Boolean descontado) { this.descontado = descontado != null ? descontado : false; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getReciboUrl() { return reciboUrl; }
    public void setReciboUrl(String reciboUrl) { this.reciboUrl = reciboUrl; }
    public BigDecimal getTasaCambioUsd() { return tasaCambioUsd; }
    public void setTasaCambioUsd(BigDecimal tasaCambioUsd) { this.tasaCambioUsd = tasaCambioUsd; }
    public BigDecimal getMontoUsd() { return montoUsd; }
    public void setMontoUsd(BigDecimal montoUsd) { this.montoUsd = montoUsd; }
}
