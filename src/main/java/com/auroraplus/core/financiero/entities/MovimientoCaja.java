package com.auroraplus.core.financiero.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "movimientos_caja")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class MovimientoCaja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId; // Preparación para Fase 2

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoMovimiento tipo; // INGRESO, EGRESO, CXC, CXP

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal monto;

    @Column(nullable = false, length = 3)
    private String moneda; // USD, VES, COP

    @Column(nullable = false)
    private String concepto;

    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    // `monto`/`moneda` (arriba) es SIEMPRE lo que físicamente entró a la caja
    // en la moneda que entró — así el cierre de caja por moneda (arqueo) puede
    // decir "hay X dólares, Y bolívares, Z pesos" real, sin mezclar todo en
    // una sola moneda. Estos campos son solo de referencia para reportes
    // consolidados (rentabilidad, etc.): cuánto vale ese mismo movimiento en
    // la moneda base del negocio, y con qué tasa se calculó. Nulos si el
    // movimiento ya estaba en la moneda base (no hubo conversión).
    @Column(name = "monto_equivalente_base", precision = 18, scale = 2)
    private BigDecimal montoEquivalenteBase;

    @Column(name = "moneda_base_equivalente", length = 3)
    private String monedaBaseEquivalente;

    @Column(name = "tasa_aplicada", precision = 18, scale = 6)
    private BigDecimal tasaAplicada;

    public enum TipoMovimiento { INGRESO, EGRESO, CXC, CXP }

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public TipoMovimiento getTipo() { return tipo; }
    public void setTipo(TipoMovimiento tipo) { this.tipo = tipo; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }
    public String getConcepto() { return concepto; }
    public void setConcepto(String concepto) { this.concepto = concepto; }
    public LocalDateTime getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(LocalDateTime fechaRegistro) { this.fechaRegistro = fechaRegistro; }
    public BigDecimal getMontoEquivalenteBase() { return montoEquivalenteBase; }
    public void setMontoEquivalenteBase(BigDecimal montoEquivalenteBase) { this.montoEquivalenteBase = montoEquivalenteBase; }
    public String getMonedaBaseEquivalente() { return monedaBaseEquivalente; }
    public void setMonedaBaseEquivalente(String monedaBaseEquivalente) { this.monedaBaseEquivalente = monedaBaseEquivalente; }
    public BigDecimal getTasaAplicada() { return tasaAplicada; }
    public void setTasaAplicada(BigDecimal tasaAplicada) { this.tasaAplicada = tasaAplicada; }
}
