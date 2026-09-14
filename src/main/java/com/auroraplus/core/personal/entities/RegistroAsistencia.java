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
 *
 * marcadorEntradaAbierta (hardening de asistencia/concurrencia): vale empleadoId mientras el
 * registro sigue abierto (fechaHoraSalida IS NULL) y NULL en cuanto se cierra. El UNIQUE
 * (tenant_id, marcador_entrada_abierta) es lo que de verdad impide DOS entradas abiertas
 * simultáneas del mismo empleado bajo solicitudes concurrentes: la verificación previa en
 * AsistenciaService.registrarEntrada (leer y luego insertar) tiene una ventana de carrera
 * clásica (TOCTOU) que dos requests a la vez pueden atravesar ambas antes de que cualquiera
 * confirme — el UNIQUE es la garantía real a nivel de base de datos, portable entre H2 y
 * PostgreSQL porque es SQL estándar (un UNIQUE normal trata cada NULL como distinto de
 * cualquier otro NULL, así que los registros ya cerrados nunca compiten entre sí).
 */
@Entity(name = "RegistroAsistenciaPersonal")
@Table(name = "personal_registros_asistencia",
    uniqueConstraints = @UniqueConstraint(columnNames = {"tenant_id", "marcador_entrada_abierta"}))
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class RegistroAsistencia {

    public enum Origen { MANUAL, TERMINAL_PIN, PLANILLA_DIGITAL, APP }

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

    // Ver comentario de clase — solo AsistenciaService lo mantiene, nunca se expone para setear
    // libremente desde afuera (por eso no tiene un caso de uso fuera del propio service).
    @Column(name = "marcador_entrada_abierta")
    private Long marcadorEntradaAbierta;

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
    public Long getMarcadorEntradaAbierta() { return marcadorEntradaAbierta; }
    public void setMarcadorEntradaAbierta(Long marcadorEntradaAbierta) { this.marcadorEntradaAbierta = marcadorEntradaAbierta; }

    @Transient
    public double getHorasTrabajadas() {
        if (fechaHoraSalida == null) return 0;
        return Duration.between(fechaHoraEntrada, fechaHoraSalida).toMinutes() / 60.0;
    }
}
