package com.auroraplus.core.rrhh.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

/**
 * Empleado con reloj checador (core, no exclusivo de un vertical — cualquier
 * negocio tiene personal que marca entrada/salida).
 */
// Nombre de entidad explícito: ya existe modules.tamanacocomercial.entities.Empleado
// con el mismo nombre simple de clase — JPA exige nombres de entidad únicos
// dentro de la unidad de persistencia salvo que se cualifiquen.
@Entity(name = "EmpleadoRrhh")
@Table(name = "empleados")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Empleado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String nombre;

    private String cedula;
    private String cargo;

    // POR_HORA (se le paga según lo marcado en el reloj — requiere tarifaPorHora),
    // SALARIO_FIJO (sueldo mensual/quincenal fijo) o SOLO_CONTROL (no se le paga
    // por lo marcado — el reloj checador se usa solo para llevar control interno
    // de asistencia y puntualidad, ej. supervisar cumplimiento de horario de un
    // empleado con sueldo fijo). En los tres casos las horas se registran igual;
    // esto solo decide si liquidarPeriodo calcula un monto a pagar o no.
    @Column(name = "tipo_control", nullable = false, length = 20)
    private String tipoControl = "SOLO_CONTROL";

    // Solo se usa (y solo tiene sentido) cuando tipoControl = POR_HORA.
    @Column(name = "tarifa_por_hora", precision = 18, scale = 2)
    private BigDecimal tarifaPorHora;

    @Column(nullable = false)
    private Boolean activo = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getCedula() { return cedula; }
    public void setCedula(String cedula) { this.cedula = cedula; }
    public String getCargo() { return cargo; }
    public void setCargo(String cargo) { this.cargo = cargo; }
    public String getTipoControl() { return tipoControl; }
    public void setTipoControl(String tipoControl) { this.tipoControl = tipoControl; }
    public BigDecimal getTarifaPorHora() { return tarifaPorHora; }
    public void setTarifaPorHora(BigDecimal tarifaPorHora) { this.tarifaPorHora = tarifaPorHora; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
}
