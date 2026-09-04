package com.auroraplus.modules.minero.entities;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

/**
 * Pago de UN trabajador dentro de una liquidación de cuadrilla. `tipoTrabajo`
 * va nulo en modalidad "tarifa única de pareja" (ver LiquidacionDestajo) —
 * ahí el rol es solo descriptivo (`rolLibre`, ej. "Picador") y la tarifa
 * real es la conjunta de la cuadrilla, repartida por porcentajeParticipacion.
 */
@Entity
@Table(name = "detalles_liquidacion_destajo")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class DetalleLiquidacionDestajo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "liquidacion_id")
    @JsonBackReference
    private LiquidacionDestajo liquidacion;

    @Column(name = "nombre_trabajador", nullable = false)
    private String nombreTrabajador;

    // Nulo en modalidad "tarifa única de pareja" — ver rolLibre en ese caso.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "tipo_trabajo_id")
    private TipoTrabajoMinero tipoTrabajo;

    // Solo se usa cuando tipoTrabajo es nulo (modalidad tarifa única) — etiqueta
    // libre para identificar el rol sin necesitar un catálogo (ej. "Picador").
    @Column(name = "rol_libre")
    private String rolLibre;

    // % de la producción total de la liquidación que le corresponde a ESTE
    // trabajador (100 si trabajó solo toda la producción, 50/50 en pareja
    // pareja, u otra repartición acordada).
    @Column(name = "porcentaje_participacion", nullable = false, precision = 5, scale = 2)
    private BigDecimal porcentajeParticipacion = new BigDecimal("100");

    @Column(name = "cantidad_asignada", nullable = false, precision = 18, scale = 4)
    private BigDecimal cantidadAsignada;

    @Column(name = "tarifa_aplicada", nullable = false, precision = 18, scale = 4)
    private BigDecimal tarifaAplicada;

    @Column(name = "monto_pagado", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoPagado;

    // Copiada de tipoTrabajo.moneda AL MOMENTO de liquidar — así el histórico
    // no cambia si más adelante se reconfigura la moneda de ese rol.
    @Column(nullable = false, length = 3)
    private String moneda;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public LiquidacionDestajo getLiquidacion() { return liquidacion; }
    public void setLiquidacion(LiquidacionDestajo liquidacion) { this.liquidacion = liquidacion; }
    public String getNombreTrabajador() { return nombreTrabajador; }
    public void setNombreTrabajador(String nombreTrabajador) { this.nombreTrabajador = nombreTrabajador; }
    public TipoTrabajoMinero getTipoTrabajo() { return tipoTrabajo; }
    public void setTipoTrabajo(TipoTrabajoMinero tipoTrabajo) { this.tipoTrabajo = tipoTrabajo; }
    public String getRolLibre() { return rolLibre; }
    public void setRolLibre(String rolLibre) { this.rolLibre = rolLibre; }
    public BigDecimal getPorcentajeParticipacion() { return porcentajeParticipacion; }
    public void setPorcentajeParticipacion(BigDecimal porcentajeParticipacion) { this.porcentajeParticipacion = porcentajeParticipacion; }
    public BigDecimal getCantidadAsignada() { return cantidadAsignada; }
    public void setCantidadAsignada(BigDecimal cantidadAsignada) { this.cantidadAsignada = cantidadAsignada; }
    public BigDecimal getTarifaAplicada() { return tarifaAplicada; }
    public void setTarifaAplicada(BigDecimal tarifaAplicada) { this.tarifaAplicada = tarifaAplicada; }
    public BigDecimal getMontoPagado() { return montoPagado; }
    public void setMontoPagado(BigDecimal montoPagado) { this.montoPagado = montoPagado; }
    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }
}
