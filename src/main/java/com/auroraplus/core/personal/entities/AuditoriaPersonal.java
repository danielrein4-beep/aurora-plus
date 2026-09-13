package com.auroraplus.core.personal.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.time.LocalDateTime;

/**
 * docs/personal-nomina-contract.md §1.4 — el campo detalle describe QUÉ cambió estructuralmente
 * ("aprobó período X", "cambió cargo de Mesero a Supervisor") y NUNCA incluye montos ni datos
 * salariales — ni aquí ni en ningún Logger de la aplicación.
 */
@Entity
@Table(name = "auditoria_personal")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class AuditoriaPersonal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(nullable = false, length = 60)
    private String accion;

    @Column(nullable = false, length = 60)
    private String entidad;

    @Column(name = "entidad_id")
    private Long entidadId;

    @Column(length = 500)
    private String detalle;

    @Column(nullable = false)
    private LocalDateTime fecha = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public String getAccion() { return accion; }
    public void setAccion(String accion) { this.accion = accion; }
    public String getEntidad() { return entidad; }
    public void setEntidad(String entidad) { this.entidad = entidad; }
    public Long getEntidadId() { return entidadId; }
    public void setEntidadId(Long entidadId) { this.entidadId = entidadId; }
    public String getDetalle() { return detalle; }
    public void setDetalle(String detalle) { this.detalle = detalle; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
}
