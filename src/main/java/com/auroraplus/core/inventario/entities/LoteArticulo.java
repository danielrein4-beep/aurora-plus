package com.auroraplus.core.inventario.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/**
 * Lote de un artículo con fecha de caducidad — capa de trazabilidad sobre el
 * Kárdex: Articulo.stockActual sigue siendo la fuente única de "cuánto hay"
 * en total, pero cada lote lleva su propio saldo (cantidadActual) que las
 * ventas van consumiendo FEFO (First-Expired-First-Out: primero se descuenta
 * el lote con la fecha de vencimiento más próxima) — ver
 * InventarioService.registrarMovimientoKardex. Un lote que llega a 0 deja de
 * aparecer en las alertas de vencimiento (ya no queda nada de ese lote que
 * pueda vencerse en la bodega).
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

    // Saldo restante de ESTE lote — cantidadIngresada queda fija como
    // registro histórico de lo que entró; cantidadActual es lo que
    // efectivamente le queda después de que las ventas la van consumiendo
    // FEFO. Columna NULLABLE a propósito (no NOT NULL con default 0): la
    // tabla ya tiene filas viejas, y un default en 0 las haría desaparecer
    // de golpe de las alertas de vencimiento aunque todavía tengan stock.
    // @PostLoad las rellena con cantidadIngresada la primera vez que se leen.
    @Column(name = "cantidad_actual", precision = 18, scale = 4)
    private BigDecimal cantidadActual;

    @PostLoad
    private void inicializarCantidadActual() {
        if (cantidadActual == null) cantidadActual = cantidadIngresada;
    }

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
    public BigDecimal getCantidadActual() { return cantidadActual; }
    public void setCantidadActual(BigDecimal cantidadActual) { this.cantidadActual = cantidadActual; }
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
