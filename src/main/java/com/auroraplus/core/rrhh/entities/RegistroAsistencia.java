package com.auroraplus.core.rrhh.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Marca de entrada/salida del reloj checador — un registro por turno trabajado. */
@Entity
@Table(name = "registros_asistencia")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class RegistroAsistencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "empleado_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Empleado empleado;

    @Column(name = "fecha_check_in", nullable = false)
    private LocalDateTime fechaCheckIn;

    // Null mientras el turno sigue abierto (el empleado todavía no marcó salida).
    @Column(name = "fecha_check_out")
    private LocalDateTime fechaCheckOut;

    @Column(name = "horas_trabajadas", precision = 10, scale = 4)
    private BigDecimal horasTrabajadas;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Empleado getEmpleado() { return empleado; }
    public void setEmpleado(Empleado empleado) { this.empleado = empleado; }
    public LocalDateTime getFechaCheckIn() { return fechaCheckIn; }
    public void setFechaCheckIn(LocalDateTime fechaCheckIn) { this.fechaCheckIn = fechaCheckIn; }
    public LocalDateTime getFechaCheckOut() { return fechaCheckOut; }
    public void setFechaCheckOut(LocalDateTime fechaCheckOut) { this.fechaCheckOut = fechaCheckOut; }
    public BigDecimal getHorasTrabajadas() { return horasTrabajadas; }
    public void setHorasTrabajadas(BigDecimal horasTrabajadas) { this.horasTrabajadas = horasTrabajadas; }
}
