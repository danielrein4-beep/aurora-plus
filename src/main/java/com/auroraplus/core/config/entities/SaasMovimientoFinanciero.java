package com.auroraplus.core.config.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "core_saas_movimientos_financieros")
public class SaasMovimientoFinanciero {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String tipo; // 'INGRESO' o 'EGRESO'

    @Column(nullable = false, length = 50)
    private String categoria;

    @Column(nullable = false, length = 200)
    private String concepto;

    @Column(name = "monto_usd", nullable = false, precision = 12, scale = 2)
    private BigDecimal montoUsd;

    @Column(name = "fecha_movimiento", nullable = false)
    private LocalDate fechaMovimiento = LocalDate.now();

    @Column(name = "metodo_pago", nullable = false, length = 50)
    private String metodoPago = "TRANSFERENCIA_BANCARIA";

    @Column(name = "referencia_comprobante", length = 100)
    private String referenciaComprobante;

    @Column(name = "tenant_id")
    private Long tenantId;

    @Column(name = "gasto_fijo_id")
    private Long gastoFijoId;

    @Column(columnDefinition = "TEXT")
    private String notas;

    @Column(name = "registrado_por", nullable = false, length = 60)
    private String registradoPor = "superadmin";

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    public SaasMovimientoFinanciero() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }

    public String getConcepto() { return concepto; }
    public void setConcepto(String concepto) { this.concepto = concepto; }

    public BigDecimal getMontoUsd() { return montoUsd; }
    public void setMontoUsd(BigDecimal montoUsd) { this.montoUsd = montoUsd; }

    public LocalDate getFechaMovimiento() { return fechaMovimiento; }
    public void setFechaMovimiento(LocalDate fechaMovimiento) { this.fechaMovimiento = fechaMovimiento; }

    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }

    public String getReferenciaComprobante() { return referenciaComprobante; }
    public void setReferenciaComprobante(String referenciaComprobante) { this.referenciaComprobante = referenciaComprobante; }

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }

    public Long getGastoFijoId() { return gastoFijoId; }
    public void setGastoFijoId(Long gastoFijoId) { this.gastoFijoId = gastoFijoId; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }

    public String getRegistradoPor() { return registradoPor; }
    public void setRegistradoPor(String registradoPor) { this.registradoPor = registradoPor; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
