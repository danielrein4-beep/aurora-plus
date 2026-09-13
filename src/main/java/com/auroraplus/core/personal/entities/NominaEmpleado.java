package com.auroraplus.core.personal.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

/**
 * Resultado calculado de un empleado en un período — mismo patrón de congelamiento de
 * MovimientoCaja: moneda/monto es lo que efectivamente se le paga, montoEquivalenteBase +
 * tasaAplicada quedan congelados en el momento del cálculo (docs/personal-nomina-contract.md §3
 * punto 4) y nunca se recalculan con la tasa vigente después.
 */
// UNIQUE(tenant_id, periodo_id, empleado_id) — candado real de base de datos contra dos hilos
// calculando el mismo período a la vez: MotorNominaService ya se protege con el @Version de
// PeriodoNomina, pero esta restricción es la última línea de defensa (mismo criterio aplicado a
// FacturaController tras el hallazgo de la condición de carrera en numeración de facturas).
@Entity
@Table(name = "nominas_empleado", uniqueConstraints = @UniqueConstraint(columnNames = {"tenant_id", "periodo_id", "empleado_id"}))
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class NominaEmpleado {

    public enum Estado { CALCULADA, EN_REVISION, APROBADA, PAGADA, REVERSADA }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "periodo_id", nullable = false)
    private Long periodoId;

    @Column(name = "empleado_id", nullable = false)
    private Long empleadoId;

    // Snapshot de qué asignación (cargo/salario) se usó para este cálculo — ver contrato §3.1.
    @Column(name = "asignacion_empleado_id", nullable = false)
    private Long asignacionEmpleadoId;

    @Column(name = "total_asignaciones", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalAsignaciones = BigDecimal.ZERO;

    @Column(name = "total_deducciones", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalDeducciones = BigDecimal.ZERO;

    @Column(name = "total_aportes_patronales", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalAportesPatronales = BigDecimal.ZERO;

    @Column(name = "neto_a_pagar", nullable = false, precision = 18, scale = 2)
    private BigDecimal netoAPagar = BigDecimal.ZERO;

    @Column(nullable = false, length = 3)
    private String moneda;

    // Congelados al calcular — null si la moneda del período ya era la moneda base del tenant.
    @Column(name = "monto_equivalente_base", precision = 18, scale = 2)
    private BigDecimal montoEquivalenteBase;

    @Column(name = "moneda_base_equivalente", length = 3)
    private String monedaBaseEquivalente;

    @Column(name = "tasa_aplicada", precision = 18, scale = 6)
    private BigDecimal tasaAplicada;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Estado estado = Estado.CALCULADA;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Long getPeriodoId() { return periodoId; }
    public void setPeriodoId(Long periodoId) { this.periodoId = periodoId; }
    public Long getEmpleadoId() { return empleadoId; }
    public void setEmpleadoId(Long empleadoId) { this.empleadoId = empleadoId; }
    public Long getAsignacionEmpleadoId() { return asignacionEmpleadoId; }
    public void setAsignacionEmpleadoId(Long asignacionEmpleadoId) { this.asignacionEmpleadoId = asignacionEmpleadoId; }
    public BigDecimal getTotalAsignaciones() { return totalAsignaciones; }
    public void setTotalAsignaciones(BigDecimal totalAsignaciones) { this.totalAsignaciones = totalAsignaciones; }
    public BigDecimal getTotalDeducciones() { return totalDeducciones; }
    public void setTotalDeducciones(BigDecimal totalDeducciones) { this.totalDeducciones = totalDeducciones; }
    public BigDecimal getTotalAportesPatronales() { return totalAportesPatronales; }
    public void setTotalAportesPatronales(BigDecimal totalAportesPatronales) { this.totalAportesPatronales = totalAportesPatronales; }
    public BigDecimal getNetoAPagar() { return netoAPagar; }
    public void setNetoAPagar(BigDecimal netoAPagar) { this.netoAPagar = netoAPagar; }
    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }
    public BigDecimal getMontoEquivalenteBase() { return montoEquivalenteBase; }
    public void setMontoEquivalenteBase(BigDecimal montoEquivalenteBase) { this.montoEquivalenteBase = montoEquivalenteBase; }
    public String getMonedaBaseEquivalente() { return monedaBaseEquivalente; }
    public void setMonedaBaseEquivalente(String monedaBaseEquivalente) { this.monedaBaseEquivalente = monedaBaseEquivalente; }
    public BigDecimal getTasaAplicada() { return tasaAplicada; }
    public void setTasaAplicada(BigDecimal tasaAplicada) { this.tasaAplicada = tasaAplicada; }
    public Estado getEstado() { return estado; }
    public void setEstado(Estado estado) { this.estado = estado; }
}
