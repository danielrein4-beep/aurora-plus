package com.auroraplus.modules.retail.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/**
 * Proveedor de Aurora Retail (Ferretería/Farmacia/Repuestos) — mismos campos
 * que ProveedorHoreca (son idénticos en todo el sistema), entidad propia para
 * no acoplar el módulo Retail al de Horeca.
 */
@Entity
@Table(name = "proveedores_retail")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class ProveedorRetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String nombre;

    private String rif;
    private String telefono;
    private String contacto;
    private String direccion;

    @Column(nullable = false)
    private Boolean activo = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getRif() { return rif; }
    public void setRif(String rif) { this.rif = rif; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public String getContacto() { return contacto; }
    public void setContacto(String contacto) { this.contacto = contacto; }
    public String getDireccion() { return direccion; }
    public void setDireccion(String direccion) { this.direccion = direccion; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
}
