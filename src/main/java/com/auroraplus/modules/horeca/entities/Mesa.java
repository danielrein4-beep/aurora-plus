package com.auroraplus.modules.horeca.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/** Registro físico de mesas del salón — base del mapa de mesas (Subfase Front of House). */
@Entity
@Table(name = "mesas")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Mesa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false, unique = false)
    private Integer numero;

    private Integer capacidad;

    private String zona; // TERRAZA, SALON_PRINCIPAL, BARRA...

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Integer getNumero() { return numero; }
    public void setNumero(Integer numero) { this.numero = numero; }
    public Integer getCapacidad() { return capacidad; }
    public void setCapacidad(Integer capacidad) { this.capacidad = capacidad; }
    public String getZona() { return zona; }
    public void setZona(String zona) { this.zona = zona; }
}
