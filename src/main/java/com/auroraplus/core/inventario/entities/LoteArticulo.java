package com.auroraplus.core.inventario.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/**
 * Lote de un artículo con fecha de caducidad — capa ADICIONAL de trazabilidad
 * sobre el Kárdex, no lo reemplaza: Articulo.stockActual sigue siendo la
 * fuente única de "cuánto hay" (las ventas y mermas se siguen descontando ahí
 * igual que siempre). Esto es solo para poder avisar cuándo un lote
 * específico está por vencer — ej. compraste 50kg de harina el lunes con
 * vencimiento en 30 días, y otros 50kg el jueves con vencimiento distinto.
 * No hace descuento automático por FEFO (primero en vencer, primero en
 * salir) — eso queda pendiente si algún día hace falta.
 */
@Entity
@Table(name = "lotes_articulo")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class LoteArticulo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "articulo_id", nullable = false)
    private Articulo articulo;

    @Column(name = "cantidad_ingresada", nullable = false, precision = 18, scale = 4)
    private BigDecimal cantidadIngresada;

    // Referencial nada más — no se descuenta automáticamente al vender (ver nota de clase);
    // el negocio puede ajustarlo a mano si quiere llevar el lote exacto restante.
    @Column(name = "costo_unitario", nullable = false, precision = 18, scale = 4)
    private BigDecimal costoUnitario;

    // Nula si el artículo no es perecedero — no todo lo que se compra vence.
    @Column(name = "fecha_vencimiento")
    private LocalDate fechaVencimiento;

    @Column(name = "referencia_compra")
    private String referenciaCompra; // ej. número de factura

    @Column(name = "fecha_ingreso", nullable = false)
    private LocalDateTime fechaIngreso = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Articulo getArticulo() { return articulo; }
    public void setArticulo(Articulo articulo) { this.articulo = articulo; }
    public BigDecimal getCantidadIngresada() { return cantidadIngresada; }
    public void setCantidadIngresada(BigDecimal cantidadIngresada) { this.cantidadIngresada = cantidadIngresada; }
    public BigDecimal getCostoUnitario() { return costoUnitario; }
    public void setCostoUnitario(BigDecimal costoUnitario) { this.costoUnitario = costoUnitario; }
    public LocalDate getFechaVencimiento() { return fechaVencimiento; }
    public void setFechaVencimiento(LocalDate fechaVencimiento) { this.fechaVencimiento = fechaVencimiento; }
    public String getReferenciaCompra() { return referenciaCompra; }
    public void setReferenciaCompra(String referenciaCompra) { this.referenciaCompra = referenciaCompra; }
    public LocalDateTime getFechaIngreso() { return fechaIngreso; }
    public void setFechaIngreso(LocalDateTime fechaIngreso) { this.fechaIngreso = fechaIngreso; }

    @Transient
    public Long getDiasParaVencer() {
        if (fechaVencimiento == null) return null;
        return ChronoUnit.DAYS.between(LocalDate.now(), fechaVencimiento);
    }

    @Transient
    public boolean isVencido() {
        return fechaVencimiento != null && fechaVencimiento.isBefore(LocalDate.now());
    }
}
