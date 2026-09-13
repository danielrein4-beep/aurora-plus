package com.auroraplus.core.personal.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

/**
 * Línea de un concepto dentro de una NominaEmpleado. reglaAplicadaId es la prueba de auditoría de
 * QUÉ fila exacta de ReglaNominaVersionada se usó (docs/personal-nomina-contract.md §3) — si esa
 * regla cambia de versión después, esta línea sigue apuntando a la vieja, así que el período ya
 * calculado nunca cambia solo.
 */
@Entity
@Table(name = "detalles_nomina")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class DetalleNomina {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "nomina_empleado_id", nullable = false)
    private Long nominaEmpleadoId;

    // Nullable: la línea de sueldo base (ver MotorNominaService.calcularSueldoBase) no deriva de
    // un ConceptoNomina configurado por el tenant, es el cálculo directo de AsignacionEmpleado.
    @Column(name = "concepto_id")
    private Long conceptoId;

    // Nullable: hay líneas (ej. el sueldo base por asistencia) que no derivan de una regla
    // configurada sino directamente de AsignacionEmpleado — ver MotorNominaService.
    @Column(name = "regla_aplicada_id")
    private Long reglaAplicadaId;

    @Column(nullable = false)
    private String descripcion;

    @Column(precision = 18, scale = 4)
    private BigDecimal cantidad;

    @Column(name = "monto_unitario", precision = 18, scale = 4)
    private BigDecimal montoUnitario;

    @Column(name = "monto_total", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoTotal;

    @Column(nullable = false, length = 3)
    private String moneda;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ConceptoNomina.Tipo tipo;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Long getNominaEmpleadoId() { return nominaEmpleadoId; }
    public void setNominaEmpleadoId(Long nominaEmpleadoId) { this.nominaEmpleadoId = nominaEmpleadoId; }
    public Long getConceptoId() { return conceptoId; }
    public void setConceptoId(Long conceptoId) { this.conceptoId = conceptoId; }
    public Long getReglaAplicadaId() { return reglaAplicadaId; }
    public void setReglaAplicadaId(Long reglaAplicadaId) { this.reglaAplicadaId = reglaAplicadaId; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public BigDecimal getCantidad() { return cantidad; }
    public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }
    public BigDecimal getMontoUnitario() { return montoUnitario; }
    public void setMontoUnitario(BigDecimal montoUnitario) { this.montoUnitario = montoUnitario; }
    public BigDecimal getMontoTotal() { return montoTotal; }
    public void setMontoTotal(BigDecimal montoTotal) { this.montoTotal = montoTotal; }
    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }
    public ConceptoNomina.Tipo getTipo() { return tipo; }
    public void setTipo(ConceptoNomina.Tipo tipo) { this.tipo = tipo; }
}
