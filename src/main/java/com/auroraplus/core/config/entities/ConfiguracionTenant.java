package com.auroraplus.core.config.entities;

import jakarta.persistence.*;

@Entity
@Table(name = "configuracion_tenant")
public class ConfiguracionTenant {

    @Id
    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "moneda_base", nullable = false, length = 3)
    private String monedaBase = "USD"; // Moneda principal de operación

    @Column(name = "usa_ves", nullable = false)
    private boolean usaVes = true; // Activo por defecto para Venezuela

    @Column(name = "usa_cop", nullable = false)
    private boolean usaCop = false; // Inactivo por defecto, se activa solo en estados fronterizos

    // Getters y Setters
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getMonedaBase() { return monedaBase; }
    public void setMonedaBase(String monedaBase) { this.monedaBase = monedaBase; }
    public boolean isUsaVes() { return usaVes; }
    public void setUsaVes(boolean usaVes) { this.usaVes = usaVes; }
    public boolean isUsaCop() { return usaCop; }
    public void setUsaCop(boolean usaCop) { this.usaCop = usaCop; }
}
