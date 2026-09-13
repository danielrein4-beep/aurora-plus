package com.auroraplus.core.personal.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/**
 * docs/personal-nomina-contract.md §1.2 — sistema de roles PROPIO de este módulo, separado del
 * Usuario.Rol global (que es operativo por vertical: cajero, médico, etc., no de RR.HH.).
 * DUENO_ADMIN (rol global) tiene acceso total sin necesitar una fila aquí — todos los demás
 * usuarios necesitan un permiso explícito asignado para tocar Personal/Nómina.
 */
@Entity
@Table(name = "permisos_personal", uniqueConstraints = @UniqueConstraint(columnNames = {"tenant_id", "usuario_id"}))
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class PermisoPersonal {

    public enum RolPersonal { RRHH, NOMINA, SUPERVISOR, EMPLEADO, AUDITOR }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RolPersonal rol;

    // Solo tiene sentido cuando rol = EMPLEADO — a cuál Empleado corresponde este usuario, para
    // que pueda consultar SU PROPIO recibo y asistencia (no la de nadie más).
    @Column(name = "empleado_id")
    private Long empleadoId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public RolPersonal getRol() { return rol; }
    public void setRol(RolPersonal rol) { this.rol = rol; }
    public Long getEmpleadoId() { return empleadoId; }
    public void setEmpleadoId(Long empleadoId) { this.empleadoId = empleadoId; }
}
