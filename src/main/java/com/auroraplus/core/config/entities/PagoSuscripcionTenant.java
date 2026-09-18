package com.auroraplus.core.config.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "pagos_suscripcion_tenant")
public class PagoSuscripcionTenant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "nombre_empresa", nullable = false)
    private String nombreEmpresa;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal monto;

    @Column(nullable = false, length = 10)
    private String moneda = "USD";

    @Column(name = "metodo_pago", nullable = false, length = 40)
    private String metodoPago = "BINANCE_USDT";

    @Column(name = "referencia_comprobante")
    private String referenciaComprobante;

    @Column(name = "meses_pagados", nullable = false)
    private Integer mesesPagados = 1;

    @Column(name = "dias_acreditados", nullable = false)
    private Integer diasAcreditados = 30;

    @Column(name = "fecha_pago", nullable = false)
    private LocalDateTime fechaPago = LocalDateTime.now();

    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    @Column(nullable = false, length = 20)
    private String estado = "CONFIRMADO";

    @Column(columnDefinition = "TEXT")
    private String notas;

    @Column(name = "registrado_por", nullable = false, length = 60)
    private String registradoPor = "superadmin";

    public PagoSuscripcionTenant() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }

    public String getNombreEmpresa() { return nombreEmpresa; }
    public void setNombreEmpresa(String nombreEmpresa) { this.nombreEmpresa = nombreEmpresa; }

    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }

    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }

    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }

    public String getReferenciaComprobante() { return referenciaComprobante; }
    public void setReferenciaComprobante(String referenciaComprobante) { this.referenciaComprobante = referenciaComprobante; }

    public Integer getMesesPagados() { return mesesPagados; }
    public void setMesesPagados(Integer mesesPagados) { this.mesesPagados = mesesPagados; }

    public Integer getDiasAcreditados() { return diasAcreditados; }
    public void setDiasAcreditados(Integer diasAcreditados) { this.diasAcreditados = diasAcreditados; }

    public LocalDateTime getFechaPago() { return fechaPago; }
    public void setFechaPago(LocalDateTime fechaPago) { this.fechaPago = fechaPago; }

    public LocalDateTime getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(LocalDateTime fechaRegistro) { this.fechaRegistro = fechaRegistro; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }

    public String getRegistradoPor() { return registradoPor; }
    public void setRegistradoPor(String registradoPor) { this.registradoPor = registradoPor; }
}
