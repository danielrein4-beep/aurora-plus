package com.auroraplus.core.auth.entities;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Token de un solo uso para el flujo "olvidé mi contraseña" — se manda por correo, vence a los
 * 30 minutos, y solo sirve una vez. Sin filtro de tenant a propósito: el usuario todavía no ha
 * iniciado sesión en este punto, no hay tenant resuelto.
 */
@Entity
@Table(name = "tokens_recuperacion_clave", indexes = {
    @Index(name = "idx_token_recuperacion_token", columnList = "token", unique = true)
})
public class TokenRecuperacionClave {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @Column(name = "expira_en", nullable = false)
    private LocalDateTime expiraEn;

    @Column(nullable = false)
    private boolean usado = false;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public LocalDateTime getExpiraEn() { return expiraEn; }
    public void setExpiraEn(LocalDateTime expiraEn) { this.expiraEn = expiraEn; }
    public boolean isUsado() { return usado; }
    public void setUsado(boolean usado) { this.usado = usado; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(LocalDateTime creadoEn) { this.creadoEn = creadoEn; }
}
