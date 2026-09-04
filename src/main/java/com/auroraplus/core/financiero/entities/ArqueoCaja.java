package com.auroraplus.core.financiero.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "arqueos_caja")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class ArqueoCaja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "id_cajero", nullable = false)
    private String idCajero;

    @Column(name = "monto_declarado", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoDeclarado;

    @Column(name = "monto_sistema", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoSistema;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal descuadre;

    @Column(nullable = false, length = 3)
    private String moneda;

    @Column(name = "fecha_arqueo", nullable = false)
    private LocalDateTime fechaArqueo = LocalDateTime.now();

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getIdCajero() { return idCajero; }
    public void setIdCajero(String idCajero) { this.idCajero = idCajero; }
    public BigDecimal getMontoDeclarado() { return montoDeclarado; }
    public void setMontoDeclarado(BigDecimal montoDeclarado) { this.montoDeclarado = montoDeclarado; }
    public BigDecimal getMontoSistema() { return montoSistema; }
    public void setMontoSistema(BigDecimal montoSistema) { this.montoSistema = montoSistema; }
    public BigDecimal getDescuadre() { return descuadre; }
    public void setDescuadre(BigDecimal descuadre) { this.descuadre = descuadre; }
    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }
    public LocalDateTime getFechaArqueo() { return fechaArqueo; }
    public void setFechaArqueo(LocalDateTime fechaArqueo) { this.fechaArqueo = fechaArqueo; }
}
