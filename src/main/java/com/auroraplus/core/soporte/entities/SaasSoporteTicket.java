package com.auroraplus.core.soporte.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_soporte_tickets")
public class SaasSoporteTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "nombre_empresa", nullable = false)
    private String nombreEmpresa;

    @Column(name = "usuario_creador", nullable = false, length = 100)
    private String usuarioCreador;

    @Column(name = "titulo_asunto", nullable = false)
    private String tituloAsunto;

    @Column(nullable = false, length = 50)
    private String categoria = "SOPORTE_TECNICO";

    @Column(nullable = false, length = 20)
    private String prioridad = "MEDIA";

    @Column(nullable = false, length = 20)
    private String estado = "ABIERTO";

    @Column(name = "agente_asignado", length = 100)
    private String agenteAsignado;

    @Column(name = "ultimo_mensaje", columnDefinition = "TEXT")
    private String ultimoMensaje;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion = LocalDateTime.now();

    public SaasSoporteTicket() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }

    public String getNombreEmpresa() { return nombreEmpresa; }
    public void setNombreEmpresa(String nombreEmpresa) { this.nombreEmpresa = nombreEmpresa; }

    public String getUsuarioCreador() { return usuarioCreador; }
    public void setUsuarioCreador(String usuarioCreador) { this.usuarioCreador = usuarioCreador; }

    public String getTituloAsunto() { return tituloAsunto; }
    public void setTituloAsunto(String tituloAsunto) { this.tituloAsunto = tituloAsunto; }

    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }

    public String getPrioridad() { return prioridad; }
    public void setPrioridad(String prioridad) { this.prioridad = prioridad; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getAgenteAsignado() { return agenteAsignado; }
    public void setAgenteAsignado(String agenteAsignado) { this.agenteAsignado = agenteAsignado; }

    public String getUltimoMensaje() { return ultimoMensaje; }
    public void setUltimoMensaje(String ultimoMensaje) { this.ultimoMensaje = ultimoMensaje; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    public LocalDateTime getFechaActualizacion() { return fechaActualizacion; }
    public void setFechaActualizacion(LocalDateTime fechaActualizacion) { this.fechaActualizacion = fechaActualizacion; }
}
