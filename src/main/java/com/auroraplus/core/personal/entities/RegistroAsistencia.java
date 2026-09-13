package com.auroraplus.core.personal.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Marca real de entrada/salida (flag "asistencia") — es lo que el motor de nómina usa para
 * calcular DIARIO/POR_HORA. Nombre de entidad y de tabla explícitos: core.rrhh.entities.
 * RegistroAsistencia ya existe apuntando a una tabla física "registros_asistencia" — mismo
 * choque que Empleado, ver comentario ahí.
 */
@Entity(name = "RegistroAsistenciaPersonal")
@Table(name = "personal_registros_asistencia")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class RegistroAsistencia {

    public enum Origen { MANUAL, BIOMETRICO, APP }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "empleado_id", nullable = false)
    private Long empleadoId;

    // Nullable — puede registrar asistencia sin un turno planificado de antemano.
    @Column(name = "turno_id")
    private Long turnoId;

    @Column(name = "fecha_hora_entrada", nullable = false)
    private LocalDateTime fechaHoraEntrada;

    // Nullable mientras el turno sigue en curso.
    @Column(name = "fecha_hora_salida")
    private LocalDateTime fechaHoraSalida;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Origen origen = Origen.MANUAL;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Long getEmpleadoId() { return empleadoId; }
    public void setEmpleadoId(Long empleadoId) { this.empleadoId = empleadoId; }
    public Long getTurnoId() { return turnoId; }
    public void setTurnoId(Long turnoId) { this.turnoId = turnoId; }
    public LocalDateTime getFechaHoraEntrada() { return fechaHoraEntrada; }
    public void setFechaHoraEntrada(LocalDateTime fechaHoraEntrada) { this.fechaHoraEntrada = fechaHoraEntrada; }
    public LocalDateTime getFechaHoraSalida() { return fechaHoraSalida; }
    public void setFechaHoraSalida(LocalDateTime fechaHoraSalida) { this.fechaHoraSalida = fechaHoraSalida; }
    public Origen getOrigen() { return origen; }
    public void setOrigen(Origen origen) { this.origen = origen; }

    @Transient
    public double getHorasTrabajadas() {
        if (fechaHoraSalida == null) return 0;
        return Duration.between(fechaHoraEntrada, fechaHoraSalida).toMinutes() / 60.0;
    }
}
