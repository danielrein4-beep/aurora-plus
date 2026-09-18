package com.auroraplus.core.rrhh.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Comprobante de un pago de nómina ya efectuado — a diferencia de Empleado
 * (que solo dice CÓMO se le paga), esto es el registro histórico de CADA vez
 * que se le pagó de verdad: cuánto, en qué período, en qué moneda. Datos del
 * empleado (nombre/cédula/cargo) van congelados aquí en vez de por relación
 * JPA — un recibo ya emitido no debe cambiar si luego se edita el empleado,
 * y evita el problema conocido en este proyecto de relaciones LAZY que
 * Jackson serializa como null si no se hace JOIN FETCH.
 */
@Entity
@Table(name = "pagos_nomina")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class PagoNomina {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "empleado_id", nullable = false)
    private Long empleadoId;

    @Column(name = "nombre_empleado", nullable = false)
    private String nombreEmpleado;

    @Column(name = "cedula_empleado", length = 50)
    private String cedulaEmpleado;

    @Column(name = "cargo_empleado", length = 100)
    private String cargoEmpleado;

    @Column(name = "periodo_desde", nullable = false)
    private LocalDate periodoDesde;

    @Column(name = "periodo_hasta", nullable = false)
    private LocalDate periodoHasta;

    @Column(name = "tipo_control", nullable = false, length = 20)
    private String tipoControl;

    @Column(name = "horas_trabajadas", precision = 18, scale = 2)
    private BigDecimal horasTrabajadas;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal monto;

    @Column(nullable = false, length = 5)
    private String moneda;

    @Column(name = "movimiento_caja_id")
    private Long movimientoCajaId;

    @Column(name = "fecha_pago", nullable = false)
    private LocalDateTime fechaPago = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Long getEmpleadoId() { return empleadoId; }
    public void setEmpleadoId(Long empleadoId) { this.empleadoId = empleadoId; }
    public String getNombreEmpleado() { return nombreEmpleado; }
    public void setNombreEmpleado(String nombreEmpleado) { this.nombreEmpleado = nombreEmpleado; }
    public String getCedulaEmpleado() { return cedulaEmpleado; }
    public void setCedulaEmpleado(String cedulaEmpleado) { this.cedulaEmpleado = cedulaEmpleado; }
    public String getCargoEmpleado() { return cargoEmpleado; }
    public void setCargoEmpleado(String cargoEmpleado) { this.cargoEmpleado = cargoEmpleado; }
    public LocalDate getPeriodoDesde() { return periodoDesde; }
    public void setPeriodoDesde(LocalDate periodoDesde) { this.periodoDesde = periodoDesde; }
    public LocalDate getPeriodoHasta() { return periodoHasta; }
    public void setPeriodoHasta(LocalDate periodoHasta) { this.periodoHasta = periodoHasta; }
    public String getTipoControl() { return tipoControl; }
    public void setTipoControl(String tipoControl) { this.tipoControl = tipoControl; }
    public BigDecimal getHorasTrabajadas() { return horasTrabajadas; }
    public void setHorasTrabajadas(BigDecimal horasTrabajadas) { this.horasTrabajadas = horasTrabajadas; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }
    public Long getMovimientoCajaId() { return movimientoCajaId; }
    public void setMovimientoCajaId(Long movimientoCajaId) { this.movimientoCajaId = movimientoCajaId; }
    public LocalDateTime getFechaPago() { return fechaPago; }
    public void setFechaPago(LocalDateTime fechaPago) { this.fechaPago = fechaPago; }
}
