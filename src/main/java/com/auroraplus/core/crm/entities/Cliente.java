package com.auroraplus.core.crm.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.time.LocalDateTime;

/**
 * CRM básico (Fase 3 del plan de escalamiento): un cliente identificado por
 * nombre/RIF, opcionalmente asociado a una venta. Deliberadamente liviano —
 * no toca el flujo caliente del POS: una venta puede cerrarse sin cliente
 * (anónima) exactamente igual que antes.
 */
@Entity
@Table(name = "clientes")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String nombre;

    @Column(name = "identificacion_rif")
    private String identificacionRif;

    private String telefono;
    private String correo;

    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getIdentificacionRif() { return identificacionRif; }
    public void setIdentificacionRif(String identificacionRif) { this.identificacionRif = identificacionRif; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }
    public LocalDateTime getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(LocalDateTime fechaRegistro) { this.fechaRegistro = fechaRegistro; }
}
