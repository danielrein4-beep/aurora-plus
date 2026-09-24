package com.auroraplus.core.auth.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Administrador de la PLATAFORMA (no de un tenant) - quien gestiona altas de
 * clientes, licencias y modulos desde /api/super-admin/**. Separado de
 * Usuario a proposito: no tiene tenantId, y su alcance es todo el sistema.
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

    @Column(name = "token_version", nullable = false)
    private int tokenVersion = 0;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    /** Secreto TOTP cifrado; ver V89 y TotpService. */
    @Column(name = "totp_secreto", columnDefinition = "TEXT")
    private String totpSecreto;

    @Column(name = "totp_activo", nullable = false)
    private boolean totpActivo = false;

    /** PROPIETARIO, SOPORTE, FINANZAS o ANALISTA; ver PermisosSuperAdmin y V90. */
    @Column(nullable = false, length = 20)
    private String rol = "PROPIETARIO";

    @Column(name = "nombre_completo", length = 120)
    private String nombreCompleto;

    @Column(name = "ultimo_acceso")
    private LocalDateTime ultimoAcceso;

    @Column(name = "debe_cambiar_clave", nullable = false)
    private boolean debeCambiarClave = false;

    /** Correo y teléfono (E.164) ya verificados; ver V91 y SuperAdminContactoController. */
    @Column(length = 160)
    private String email;

    @Column(length = 20)
    private String telefono;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }
    public int getTokenVersion() { return tokenVersion; }
    public void setTokenVersion(int tokenVersion) { this.tokenVersion = tokenVersion; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
    public String getTotpSecreto() { return totpSecreto; }
    public void setTotpSecreto(String totpSecreto) { this.totpSecreto = totpSecreto; }
    public boolean isTotpActivo() { return totpActivo; }
    public void setTotpActivo(boolean totpActivo) { this.totpActivo = totpActivo; }
    public String getRol() { return rol; }
    public void setRol(String rol) { this.rol = rol; }
    public String getNombreCompleto() { return nombreCompleto; }
    public void setNombreCompleto(String nombreCompleto) { this.nombreCompleto = nombreCompleto; }
    public LocalDateTime getUltimoAcceso() { return ultimoAcceso; }
    public void setUltimoAcceso(LocalDateTime ultimoAcceso) { this.ultimoAcceso = ultimoAcceso; }
    public boolean isDebeCambiarClave() { return debeCambiarClave; }
    public void setDebeCambiarClave(boolean debeCambiarClave) { this.debeCambiarClave = debeCambiarClave; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
}
