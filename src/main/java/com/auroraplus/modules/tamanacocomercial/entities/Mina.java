package com.auroraplus.modules.tamanacocomercial.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

@Entity
@Table(name = "minas_comercial")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Mina {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String nombre;

    @Column(name = "tarifa_cop_por_ton", nullable = false, precision = 18, scale = 2)
    private BigDecimal tarifaCopPorTon;

    @Column(nullable = false)
    private Boolean activa = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre != null ? nombre.trim().toUpperCase() : null; }
    public BigDecimal getTarifaCopPorTon() { return tarifaCopPorTon; }
    public void setTarifaCopPorTon(BigDecimal tarifaCopPorTon) { this.tarifaCopPorTon = tarifaCopPorTon; }
    public Boolean getActiva() { return activa; }
    public void setActiva(Boolean activa) { this.activa = activa; }
}
