package com.auroraplus.core.auth.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Administrador de la PLATAFORMA (no de un tenant) — quien gestiona altas de
 * clientes, licencias y módulos desde /api/super-admin/**. Separado de
 * Usuario a propósito: no tiene tenantId, y su alcance es todo el sistema.
 */
@Entity
@Table(name = "usuarios_super_admin")
public class UsuarioSuperAdmin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 60)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private boolean activo = true;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
