package com.auroraplus.core.config.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Comisión de intermediación que Aurora+ cobra a un tenant cuando una
 * transacción se concreta a través de la plataforma (ej: oferta de compra de
 * un animal aceptada en el módulo Ganadería). Vive en core.config junto a
 * LicenciaTenant porque es facturación de la plataforma hacia el cliente, no
 * dinero del propio negocio del tenant — por eso NO se registra como
 * MovimientoCaja del tenant.
 */
@Entity
@Table(name = "comisiones_plataforma")
public class ComisionPlataforma {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false, length = 40)
    private String origen; // ej: "ganaderia-oferta-compra"

    @Column(name = "referencia_id", nullable = false)
    private Long referenciaId; // id de la OfertaCompra u otro origen

    @Column(name = "monto_base", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoBase;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal porcentaje;

    @Column(name = "monto_comision", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoComision;

    @Column(nullable = false)
    private Boolean pagada = false;

    @Column(nullable = false)
    private LocalDateTime fecha = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getOrigen() { return origen; }
    public void setOrigen(String origen) { this.origen = origen; }
    public Long getReferenciaId() { return referenciaId; }
    public void setReferenciaId(Long referenciaId) { this.referenciaId = referenciaId; }
    public BigDecimal getMontoBase() { return montoBase; }
    public void setMontoBase(BigDecimal montoBase) { this.montoBase = montoBase; }
    public BigDecimal getPorcentaje() { return porcentaje; }
    public void setPorcentaje(BigDecimal porcentaje) { this.porcentaje = porcentaje; }
    public BigDecimal getMontoComision() { return montoComision; }
    public void setMontoComision(BigDecimal montoComision) { this.montoComision = montoComision; }
    public Boolean getPagada() { return pagada; }
    public void setPagada(Boolean pagada) { this.pagada = pagada; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
}
