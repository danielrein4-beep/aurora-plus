package com.auroraplus.core.financiero.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Control de Caja por Turnos: a diferencia del arqueo "ciego" (ArqueoCaja,
 * que solo mide el delta ingresos-egresos desde el último cierre, sin monto
 * de apertura), un Turno registra explícitamente cuánto efectivo había AL
 * ABRIR la caja — necesario para un Cierre Z real: lo esperado en caja es
 * montoBase + ingresos - egresos del turno, no solo el delta de movimientos.
 */
@Entity
@Table(name = "turnos_caja")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Turno {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "id_cajero", nullable = false)
    private String idCajero;

    @Column(nullable = false, length = 3)
    private String moneda;

    @Column(name = "monto_base", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoBase;

    @Column(name = "fecha_apertura", nullable = false)
    private LocalDateTime fechaApertura = LocalDateTime.now();

    @Column(name = "fecha_cierre")
    private LocalDateTime fechaCierre;

    // Congelados al cerrar — el turno ya cerrado no debe recalcularse si
    // después se editan movimientos de otro turno.
    @Column(name = "monto_declarado", precision = 18, scale = 2)
    private BigDecimal montoDeclarado;

    @Column(name = "monto_esperado", precision = 18, scale = 2)
    private BigDecimal montoEsperado;

    @Column(precision = 18, scale = 2)
    private BigDecimal descuadre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private EstadoTurno estado = EstadoTurno.ABIERTO;

    public enum EstadoTurno { ABIERTO, CERRADO }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getIdCajero() { return idCajero; }
    public void setIdCajero(String idCajero) { this.idCajero = idCajero; }
    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }
    public BigDecimal getMontoBase() { return montoBase; }
    public void setMontoBase(BigDecimal montoBase) { this.montoBase = montoBase; }
    public LocalDateTime getFechaApertura() { return fechaApertura; }
    public void setFechaApertura(LocalDateTime fechaApertura) { this.fechaApertura = fechaApertura; }
    public LocalDateTime getFechaCierre() { return fechaCierre; }
    public void setFechaCierre(LocalDateTime fechaCierre) { this.fechaCierre = fechaCierre; }
    public BigDecimal getMontoDeclarado() { return montoDeclarado; }
    public void setMontoDeclarado(BigDecimal montoDeclarado) { this.montoDeclarado = montoDeclarado; }
    public BigDecimal getMontoEsperado() { return montoEsperado; }
    public void setMontoEsperado(BigDecimal montoEsperado) { this.montoEsperado = montoEsperado; }
    public BigDecimal getDescuadre() { return descuadre; }
    public void setDescuadre(BigDecimal descuadre) { this.descuadre = descuadre; }
    public EstadoTurno getEstado() { return estado; }
    public void setEstado(EstadoTurno estado) { this.estado = estado; }
}
