package com.auroraplus.core.auth.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.time.LocalDateTime;

/**
 * Usuario que pertenece a UN tenant (dueño, cajero, encargado de inventario)
 * — distinto de UsuarioSuperAdmin, que no pertenece a ningún tenant y
 * administra la plataforma completa. El username solo necesita ser único
 * DENTRO del tenant (dos negocios distintos pueden ambos tener un "admin").
 */
@Entity(name = "UsuarioAuth")
@Table(name = "usuarios", uniqueConstraints = @UniqueConstraint(columnNames = {"tenant_id", "username"}))
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Usuario {

    public enum Rol {
        DUENO_ADMIN,
        CAJERO_VENDEDOR,
        ENCARGADO_INVENTARIO,
        MEDICO,
        RECEPCIONISTA
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false, length = 60)
    private String username;

    @JsonIgnore
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Rol rol;

    @Column(name = "nombre_completo")
    private String nombreCompleto;

    @Column(nullable = false)
    private boolean activo = true;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public Rol getRol() { return rol; }
    public void setRol(Rol rol) { this.rol = rol; }
    public String getNombreCompleto() { return nombreCompleto; }
    public void setNombreCompleto(String nombreCompleto) { this.nombreCompleto = nombreCompleto; }
    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
