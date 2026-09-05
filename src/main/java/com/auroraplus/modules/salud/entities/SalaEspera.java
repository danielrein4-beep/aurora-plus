package com.auroraplus.modules.salud.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;

/**
 * Control de flujo en tiempo real de pacientes en sala de espera / turnero digital.
 */
@Entity
@Table(name = "salud_sala_espera", indexes = {
    @Index(name = "idx_salud_sala_tenant_estado", columnList = "tenant_id, estado")
})
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class SalaEspera {

    public enum EstadoEspera {
        EN_ESPERA,
        EN_CONSULTA,
        ATENDIDO,
        ABANDONADO
    }

    public enum Prioridad {
        NORMAL,
        PREFERENCIAL,
        URGENCIA
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "paciente_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Paciente paciente;

    @Column(name = "cita_id")
    private Long citaId;

    @Column(name = "medico_id", nullable = false)
    private Long medicoId;

    @Column(name = "medico_nombre", length = 150)
    private String medicoNombre;

    @Column(length = 50)
    private String consultorio;

    @Column(name = "hora_llegada", nullable = false)
    private LocalDateTime horaLlegada = LocalDateTime.now();

    @Column(name = "hora_llamado")
    private LocalDateTime horaLlamado;

    @Column(name = "hora_finalizacion")
    private LocalDateTime horaFinalizacion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EstadoEspera estado = EstadoEspera.EN_ESPERA;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Prioridad prioridad = Prioridad.NORMAL;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Paciente getPaciente() { return paciente; }
    public void setPaciente(Paciente paciente) { this.paciente = paciente; }
    public Long getCitaId() { return citaId; }
    public void setCitaId(Long citaId) { this.citaId = citaId; }
    public Long getMedicoId() { return medicoId; }
    public void setMedicoId(Long medicoId) { this.medicoId = medicoId; }
    public String getMedicoNombre() { return medicoNombre; }
    public void setMedicoNombre(String medicoNombre) { this.medicoNombre = medicoNombre; }
    public String getConsultorio() { return consultorio; }
    public void setConsultorio(String consultorio) { this.consultorio = consultorio; }
    public LocalDateTime getHoraLlegada() { return horaLlegada; }
    public void setHoraLlegada(LocalDateTime horaLlegada) { this.horaLlegada = horaLlegada; }
    public LocalDateTime getHoraLlamado() { return horaLlamado; }
    public void setHoraLlamado(LocalDateTime horaLlamado) { this.horaLlamado = horaLlamado; }
    public LocalDateTime getHoraFinalizacion() { return horaFinalizacion; }
    public void setHoraFinalizacion(LocalDateTime horaFinalizacion) { this.horaFinalizacion = horaFinalizacion; }
    public EstadoEspera getEstado() { return estado; }
    public void setEstado(EstadoEspera estado) { this.estado = estado; }
    public Prioridad getPrioridad() { return prioridad; }
    public void setPrioridad(Prioridad prioridad) { this.prioridad = prioridad; }
}
