package com.auroraplus.core.auditoria.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;

/**
 * Bitácora única y transversal a las 5 verticales (Horeca, Comercio, Ganadería,
 * Mediclinic, Tamanaco Comercial) — quién hizo qué, cuándo y sobre qué registro.
 * Solo el Dueño/Administrador del tenant puede consultarla (ver AuditoriaController).
 * Append-only: nunca se edita ni se borra una fila desde la aplicación.
 */
@Entity
@Table(name = "core_registro_auditoria", indexes = {
    @Index(name = "idx_auditoria_tenant_fecha", columnList = "tenant_id, fecha DESC")
})
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class RegistroAuditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private LocalDateTime fecha = LocalDateTime.now();

    /** Vertical/módulo de origen: HORECA, COMERCIO, GANADERIA, SALUD, TAMANACO_COMERCIAL, PERSONAL. */
    @Column(nullable = false, length = 40)
    private String modulo;

    /** CREAR, EDITAR, ELIMINAR — a veces una acción de negocio más específica (ANULAR, APROBAR). */
    @Column(nullable = false, length = 30)
    private String accion;

    /** Tipo de entidad afectada, ej. "Producto", "Venta", "Usuario". */
    @Column(nullable = false, length = 60)
    private String entidad;

    @Column(name = "entidad_id")
    private String entidadId;

    @Column(nullable = false, length = 500)
    private String descripcion;

    /** Username/email de quien ejecutó la acción, resuelto de AuthContext — nunca del cliente. */
    @Column(nullable = false, length = 100)
    private String usuario;

    @Column(length = 30)
    private String rolUsuario;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public String getModulo() { return modulo; }
    public void setModulo(String modulo) { this.modulo = modulo; }
    public String getAccion() { return accion; }
    public void setAccion(String accion) { this.accion = accion; }
    public String getEntidad() { return entidad; }
    public void setEntidad(String entidad) { this.entidad = entidad; }
    public String getEntidadId() { return entidadId; }
    public void setEntidadId(String entidadId) { this.entidadId = entidadId; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public String getUsuario() { return usuario; }
    public void setUsuario(String usuario) { this.usuario = usuario; }
    public String getRolUsuario() { return rolUsuario; }
    public void setRolUsuario(String rolUsuario) { this.rolUsuario = rolUsuario; }
}
