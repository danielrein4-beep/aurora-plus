package com.auroraplus.core.notificaciones.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.time.LocalDateTime;

/**
 * Notificación silenciosa para el rol administrador/dueño — no dispara correo
 * ni push todavía, solo queda registrada con timestamp exacto para que el
 * dueño la vea la próxima vez que abra el panel (ver DESCUADRE_CAJA en
 * TesoreriaService). Genérica a propósito: cualquier módulo puede escribir
 * acá sin tener que inventar su propia tabla de alertas.
 */
@Entity
@Table(name = "alertas_admin")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class AlertaAdmin {

    public enum Tipo { DESCUADRE_CAJA }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private Tipo tipo;

    @Column(nullable = false, length = 500)
    private String mensaje;

    @Column(nullable = false)
    private boolean leida = false;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Tipo getTipo() { return tipo; }
    public void setTipo(Tipo tipo) { this.tipo = tipo; }
    public String getMensaje() { return mensaje; }
    public void setMensaje(String mensaje) { this.mensaje = mensaje; }
    public boolean isLeida() { return leida; }
    public void setLeida(boolean leida) { this.leida = leida; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
