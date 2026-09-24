package com.auroraplus.modules.pacientesapp.entities;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/** Cita pedida desde la app. Al aceptarla, la clínica la convierte en una cita real (salud_citas). */
@Entity
@Table(name = "app_pacientes_solicitudes_cita", indexes = {
    @Index(name = "idx_app_solicitudes_tenant_estado", columnList = "tenant_id, estado"),
    @Index(name = "idx_app_solicitudes_paciente", columnList = "paciente_app_id")
})
public class SolicitudCitaApp {

    public enum Estado { SOLICITADA, ACEPTADA, RECHAZADA, CANCELADA }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "paciente_app_id", nullable = false)
    private PacienteApp paciente;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "hora_fin", nullable = false)
    private LocalTime horaFin;

    @Column(length = 255)
    private String motivo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Estado estado = Estado.SOLICITADA;

    @Column(name = "cita_id")
    private Long citaId;

    @Column(length = 255)
    private String respuesta;

    @Column(name = "respondido_por", length = 100)
    private String respondidoPor;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    @Column(name = "respondido_en")
    private LocalDateTime respondidoEn;

    public Long getId() { return id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public PacienteApp getPaciente() { return paciente; }
    public void setPaciente(PacienteApp paciente) { this.paciente = paciente; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public LocalTime getHoraInicio() { return horaInicio; }
    public void setHoraInicio(LocalTime horaInicio) { this.horaInicio = horaInicio; }
    public LocalTime getHoraFin() { return horaFin; }
    public void setHoraFin(LocalTime horaFin) { this.horaFin = horaFin; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
    public Estado getEstado() { return estado; }
    public void setEstado(Estado estado) { this.estado = estado; }
    public Long getCitaId() { return citaId; }
    public void setCitaId(Long citaId) { this.citaId = citaId; }
    public String getRespuesta() { return respuesta; }
    public void setRespuesta(String respuesta) { this.respuesta = respuesta; }
    public String getRespondidoPor() { return respondidoPor; }
    public void setRespondidoPor(String respondidoPor) { this.respondidoPor = respondidoPor; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
    public LocalDateTime getRespondidoEn() { return respondidoEn; }
    public void setRespondidoEn(LocalDateTime respondidoEn) { this.respondidoEn = respondidoEn; }
}
