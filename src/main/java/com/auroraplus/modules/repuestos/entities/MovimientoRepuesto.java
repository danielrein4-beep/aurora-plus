package com.auroraplus.modules.repuestos.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Kárdex del catálogo de repuestos: cada compra, venta o ajuste queda
 * registrado con saldo anterior/nuevo, para poder auditar cualquier
 * descuadre de inventario (lo que el módulo no tenía originalmente).
 */
@Entity
@Table(name = "movimientos_repuesto")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class MovimientoRepuesto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repuesto_id", nullable = false)
    private RepuestoItem repuesto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoMovimiento tipo;

    @Column(nullable = false, precision = 18, scale = 4)
    private BigDecimal cantidad;

    @Column(name = "stock_anterior", nullable = false, precision = 18, scale = 4)
    private BigDecimal stockAnterior;

    @Column(name = "stock_nuevo", nullable = false, precision = 18, scale = 4)
    private BigDecimal stockNuevo;

    @Column(nullable = false)
    private String motivo;

    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    // Clasificación ABC de clientes: antes el Kárdex sabía QUÉ se vendió pero
    // nunca A QUIÉN, así que no había forma de calcular el historial de compra
    // real de un cliente. Ambos campos son opcionales — una venta anónima
    // (sin cliente seleccionado en el POS) sigue funcionando igual que antes.
    @Column(name = "cliente_id")
    private Long clienteId;

    @Column(precision = 18, scale = 2)
    private BigDecimal total;

    // Costo unitario del repuesto congelado al momento de ESTA venta (ver V56) — no el
    // costo actual del catálogo, que puede haber cambiado desde entonces. Null en
    // movimientos de COMPRA/AJUSTE y en ventas históricas previas a V56; el reporte de
    // costos (RepuestosCosteoProvider) excluye esas filas de "ventasConCostoConocido"
    // en vez de asumir el costo de hoy — evita inventar un margen falso.
    @Column(name = "costo_unitario", precision = 18, scale = 4)
    private BigDecimal costoUnitario;

    /** En una DEVOLUCION, la venta (movimiento VENTA) de la que vuelve la mercancía. */
    @Column(name = "movimiento_origen_id")
    private Long movimientoOrigenId;

    public Long getMovimientoOrigenId() { return movimientoOrigenId; }
    public void setMovimientoOrigenId(Long movimientoOrigenId) { this.movimientoOrigenId = movimientoOrigenId; }

    /** DEVOLUCION: mercancía que un cliente regresa; resta en los reportes de ventas y utilidad. */
    public enum TipoMovimiento { COMPRA, VENTA, AJUSTE, DEVOLUCION }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public RepuestoItem getRepuesto() { return repuesto; }
    public void setRepuesto(RepuestoItem repuesto) { this.repuesto = repuesto; }
    public TipoMovimiento getTipo() { return tipo; }
    public void setTipo(TipoMovimiento tipo) { this.tipo = tipo; }
    public BigDecimal getCantidad() { return cantidad; }
    public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }
    public BigDecimal getStockAnterior() { return stockAnterior; }
    public void setStockAnterior(BigDecimal stockAnterior) { this.stockAnterior = stockAnterior; }
    public BigDecimal getStockNuevo() { return stockNuevo; }
    public void setStockNuevo(BigDecimal stockNuevo) { this.stockNuevo = stockNuevo; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
    public LocalDateTime getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(LocalDateTime fechaRegistro) { this.fechaRegistro = fechaRegistro; }
    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public BigDecimal getCostoUnitario() { return costoUnitario; }
    public void setCostoUnitario(BigDecimal costoUnitario) { this.costoUnitario = costoUnitario; }
}
