package com.auroraplus.core.soporte.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_soporte_mensajes")
public class SaasSoporteMensaje {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_id", nullable = false)
    private Long ticketId;

    @Column(name = "emisor_tipo", nullable = false, length = 20)
    private String emisorTipo;

    @Column(name = "emisor_nombre", nullable = false, length = 100)
    private String emisorNombre;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String contenido;

    @Column(name = "fecha_envio", nullable = false)
    private LocalDateTime fechaEnvio = LocalDateTime.now();

    @Column(name = "leido_por_destinatario", nullable = false)
    private boolean leidoPorDestinatario = false;

    public SaasSoporteMensaje() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTicketId() { return ticketId; }
    public void setTicketId(Long ticketId) { this.ticketId = ticketId; }

    public String getEmisorTipo() { return emisorTipo; }
    public void setEmisorTipo(String emisorTipo) { this.emisorTipo = emisorTipo; }

    public String getEmisorNombre() { return emisorNombre; }
    public void setEmisorNombre(String emisorNombre) { this.emisorNombre = emisorNombre; }

    public String getContenido() { return contenido; }
    public void setContenido(String contenido) { this.contenido = contenido; }

    public LocalDateTime getFechaEnvio() { return fechaEnvio; }
    public void setFechaEnvio(LocalDateTime fechaEnvio) { this.fechaEnvio = fechaEnvio; }

    public boolean isLeidoPorDestinatario() { return leidoPorDestinatario; }
    public void setLeidoPorDestinatario(boolean leidoPorDestinatario) { this.leidoPorDestinatario = leidoPorDestinatario; }
}
