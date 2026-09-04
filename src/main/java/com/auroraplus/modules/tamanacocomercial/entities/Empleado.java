package com.auroraplus.modules.tamanacocomercial.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "empleados_comercial")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Empleado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    private String nombre;
    private String cedula;
    private String cargo;

    @Column(name = "salario_base", precision = 18, scale = 2)
    private BigDecimal salarioBase;

    private String moneda; // COP, USD, VES
    private String frecuenciaPago; // SEMANAL, QUINCENAL, MENSUAL

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Transient
    private Long ultimoGastoId;

    @Transient
    private String reciboUrl;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getCedula() { return cedula; }
    public void setCedula(String cedula) { this.cedula = cedula; }
    public String getCargo() { return cargo; }
    public void setCargo(String cargo) { this.cargo = cargo; }
    public BigDecimal getSalarioBase() { return salarioBase; }
    public void setSalarioBase(BigDecimal salarioBase) { this.salarioBase = salarioBase; }
    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }
    public String getFrecuenciaPago() { return frecuenciaPago; }
    public void setFrecuenciaPago(String frecuenciaPago) { this.frecuenciaPago = frecuenciaPago; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public Long getUltimoGastoId() { return ultimoGastoId; }
    public void setUltimoGastoId(Long ultimoGastoId) { this.ultimoGastoId = ultimoGastoId; }
    public String getReciboUrl() { return reciboUrl; }
    public void setReciboUrl(String reciboUrl) { this.reciboUrl = reciboUrl; }
}
