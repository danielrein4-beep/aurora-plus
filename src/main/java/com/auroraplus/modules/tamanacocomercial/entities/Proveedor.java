package com.auroraplus.modules.tamanacocomercial.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.time.LocalDate;

@Entity
@Table(name = "proveedores_comercial")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Proveedor {

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

    // Mina, Combustible, Repuestos, Servicios, Transporte, General
    @Column(nullable = false)
    private String tipo = "General";

    private String direccion;

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_registro", nullable = false)
    private LocalDate fechaRegistro = LocalDate.now();

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
    public String getTipo() { return tipo != null ? tipo : "General"; }
    public void setTipo(String tipo) { this.tipo = (tipo != null && !tipo.trim().isEmpty()) ? tipo : "General"; }
    public String getDireccion() { return direccion; }
    public void setDireccion(String direccion) { this.direccion = direccion; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo != null ? activo : true; }
    public LocalDate getFechaRegistro() { return fechaRegistro != null ? fechaRegistro : LocalDate.now(); }
    public void setFechaRegistro(LocalDate fechaRegistro) { this.fechaRegistro = fechaRegistro; }
}
