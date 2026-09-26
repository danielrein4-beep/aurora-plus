package com.auroraplus.modules.pacientesapp.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Cómo se ve un consultorio de Salud en el directorio de la app de pacientes.
 * Cada tenant de Salud es la práctica de un solo médico (ver MedicoTenantResolver),
 * así que un perfil = un médico. Solo aparece si la clínica lo publica.
 */
@Entity
@Table(name = "app_pacientes_perfil_consultorio")
public class PerfilConsultorio {

    @Id
    @Column(name = "tenant_id")
    private Long tenantId;

    @Column(nullable = false)
    private boolean publicado = false;

    @Column(nullable = false, length = 5)
    private String trato = "Dr.";

    /** Id de especialidad de la app: general, cardiologia, pediatria... */
    @Column(nullable = false, length = 40)
    private String especialidad = "general";

    @Column(length = 80)
    private String ciudad;

    @Column(name = "precio_consulta", precision = 18, scale = 2)
    private BigDecimal precioConsulta;

    @Column(nullable = false, length = 10)
    private String moneda = "USD";

    @Column(name = "anios_experiencia")
    private Integer aniosExperiencia;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "acepta_mensajes", nullable = false)
    private boolean aceptaMensajes = false;

    @Column(name = "confirmacion_automatica", nullable = false)
    private boolean confirmacionAutomatica = false;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio = LocalTime.of(8, 0);

    @Column(name = "hora_fin", nullable = false)
    private LocalTime horaFin = LocalTime.of(17, 0);

    @Column(name = "duracion_minutos", nullable = false)
    private int duracionMinutos = 30;

    /** 1 = lunes ... 7 = domingo, separados por coma. */
    @Column(name = "dias_atencion", nullable = false, length = 20)
    private String diasAtencion = "1,2,3,4,5";

    @Column(name = "actualizado_en", nullable = false)
    private LocalDateTime actualizadoEn = LocalDateTime.now();

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public boolean isPublicado() { return publicado; }
    public void setPublicado(boolean publicado) { this.publicado = publicado; }
    public String getTrato() { return trato; }
    public void setTrato(String trato) { this.trato = trato; }
    public String getEspecialidad() { return especialidad; }
    public void setEspecialidad(String especialidad) { this.especialidad = especialidad; }
    public String getCiudad() { return ciudad; }
    public void setCiudad(String ciudad) { this.ciudad = ciudad; }
    public BigDecimal getPrecioConsulta() { return precioConsulta; }
    public void setPrecioConsulta(BigDecimal precioConsulta) { this.precioConsulta = precioConsulta; }
    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }
    public Integer getAniosExperiencia() { return aniosExperiencia; }
    public void setAniosExperiencia(Integer aniosExperiencia) { this.aniosExperiencia = aniosExperiencia; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public boolean isAceptaMensajes() { return aceptaMensajes; }
    public void setAceptaMensajes(boolean aceptaMensajes) { this.aceptaMensajes = aceptaMensajes; }
    public boolean isConfirmacionAutomatica() { return confirmacionAutomatica; }
    public void setConfirmacionAutomatica(boolean confirmacionAutomatica) { this.confirmacionAutomatica = confirmacionAutomatica; }
    public LocalTime getHoraInicio() { return horaInicio; }
    public void setHoraInicio(LocalTime horaInicio) { this.horaInicio = horaInicio; }
    public LocalTime getHoraFin() { return horaFin; }
    public void setHoraFin(LocalTime horaFin) { this.horaFin = horaFin; }
    public int getDuracionMinutos() { return duracionMinutos; }
    public void setDuracionMinutos(int duracionMinutos) { this.duracionMinutos = duracionMinutos; }
    public String getDiasAtencion() { return diasAtencion; }
    public void setDiasAtencion(String diasAtencion) { this.diasAtencion = diasAtencion; }
    public LocalDateTime getActualizadoEn() { return actualizadoEn; }
    public void setActualizadoEn(LocalDateTime actualizadoEn) { this.actualizadoEn = actualizadoEn; }
}
