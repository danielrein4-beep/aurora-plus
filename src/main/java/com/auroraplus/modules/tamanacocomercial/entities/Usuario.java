package com.auroraplus.modules.tamanacocomercial.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/**
 * Réplica estructural del usuario del sistema original. IMPORTANTE: esta clase
 * es solo el modelo de datos — no incluye Spring Security, hashing de
 * contraseña ni endpoints de login/autenticación, porque aurora-plus no tiene
 * (todavía) infraestructura de seguridad configurada. Persistir esto tal cual,
 * sin BCryptPasswordEncoder u otro hashing, expondría contraseñas en texto
 * plano si se usara para autenticación real.
 */
@Entity
@Table(name = "usuarios_comercial")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String rol = "OPERACIONES"; // CEO, ADM, OPERACIONES

    @Column(nullable = false)
    private Boolean activo = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email != null ? email.trim().toLowerCase() : null; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getRol() { return rol; }
    public void setRol(String rol) { this.rol = (rol != null && !rol.trim().isEmpty()) ? rol.toUpperCase() : "OPERACIONES"; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
}
