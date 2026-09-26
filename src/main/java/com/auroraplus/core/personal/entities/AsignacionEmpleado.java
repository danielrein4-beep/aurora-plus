package com.auroraplus.core.personal.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * docs/personal-nomina-contract.md §2.1 — histórico append-only, mismo criterio que TasaCambio:
 * "cambiar de cargo o de salario" NUNCA hace UPDATE sobre una fila existente, cierra
 * vigenciaHasta de la actual y crea una fila nueva. Sin esto, una nómina ya calculada podría
 * verse afectada retroactivamente si alguien edita el salario "actual" del empleado.
 */
@Entity
@Table(name = "asignaciones_empleado")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class AsignacionEmpleado {

    public enum TipoSalario { FIJO_MENSUAL, DIARIO, POR_HORA, POR_JORNADA }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "empleado_id", nullable = false)
    private Long empleadoId;

    @Column(name = "cargo_id", nullable = false)
    private Long cargoId;

    // Texto libre a propósito (docs/personal-nomina-contract.md §6.2) — etiqueta para cuando se
    // conecte esa vertical en una fase futura, NO una FK real a ninguna tabla de vertical.
    @Column(name = "modulo_origen", length = 30)
    private String moduloOrigen;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_salario", nullable = false, length = 20)
    private TipoSalario tipoSalario;

    @Column(name = "salario_pactado", nullable = false, precision = 18, scale = 2)
    private BigDecimal salarioPactado;

    @Column(name = "moneda_salario", nullable = false, length = 3)
    private String monedaSalario;

    @Column(name = "vigencia_desde", nullable = false)
    private LocalDate vigenciaDesde;

    // Null = asignación activa.
    @Column(name = "vigencia_hasta")
    private LocalDate vigenciaHasta;

    /** Cada cuánto se le paga: SEMANAL, QUINCENAL o MENSUAL (el sueldo pactado sigue siendo mensual en FIJO_MENSUAL). */
    @Column(name = "frecuencia_pago", nullable = false, length = 12)
    private String frecuenciaPago = "QUINCENAL";

    public String getFrecuenciaPago() { return frecuenciaPago; }
    public void setFrecuenciaPago(String frecuenciaPago) { this.frecuenciaPago = frecuenciaPago; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Long getEmpleadoId() { return empleadoId; }
    public void setEmpleadoId(Long empleadoId) { this.empleadoId = empleadoId; }
    public Long getCargoId() { return cargoId; }
    public void setCargoId(Long cargoId) { this.cargoId = cargoId; }
    public String getModuloOrigen() { return moduloOrigen; }
    public void setModuloOrigen(String moduloOrigen) { this.moduloOrigen = moduloOrigen; }
    public TipoSalario getTipoSalario() { return tipoSalario; }
    public void setTipoSalario(TipoSalario tipoSalario) { this.tipoSalario = tipoSalario; }
    public BigDecimal getSalarioPactado() { return salarioPactado; }
    public void setSalarioPactado(BigDecimal salarioPactado) { this.salarioPactado = salarioPactado; }
    public String getMonedaSalario() { return monedaSalario; }
    public void setMonedaSalario(String monedaSalario) { this.monedaSalario = monedaSalario; }
    public LocalDate getVigenciaDesde() { return vigenciaDesde; }
    public void setVigenciaDesde(LocalDate vigenciaDesde) { this.vigenciaDesde = vigenciaDesde; }
    public LocalDate getVigenciaHasta() { return vigenciaHasta; }
    public void setVigenciaHasta(LocalDate vigenciaHasta) { this.vigenciaHasta = vigenciaHasta; }
}
