package com.auroraplus.modules.retail.entities;

import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.core.inventario.entities.PresentacionArticulo;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "items_venta_retail")
public class ItemVentaRetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venta_id", nullable = false)
    private VentaRetail venta;

    // EAGER: se serializa directo en la respuesta de POST /api/retail/ventas
    // (el ticket) — mismo criterio que el resto de relaciones que Jackson
    // necesita ver ya cargadas (ver Hibernate6Module).
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "articulo_id", nullable = false)
    private Articulo articulo;

    // Presente si se vendió por presentación cerrada (caja, rollo) en vez de
    // la unidad suelta — determina el "pricing por volumen" de Ferretería.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "presentacion_id")
    private PresentacionArticulo presentacion;

    // Cantidad en la UNIDAD BASE del artículo (ya convertida si vino por
    // presentación) — venta fraccionada: admite decimales (1.5 m, 0.5 kg).
    @Column(nullable = false, precision = 18, scale = 4)
    private BigDecimal cantidad;

    @Column(name = "precio_unitario", nullable = false, precision = 18, scale = 4)
    private BigDecimal precioUnitario;

    // Costo CONGELADO al momento de la venta, igual criterio que ItemComanda —
    // no se recalcula después aunque cambie el costo del artículo.
    @Column(name = "costo_unitario", nullable = false, precision = 18, scale = 4)
    private BigDecimal costoUnitario;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public VentaRetail getVenta() { return venta; }
    public void setVenta(VentaRetail venta) { this.venta = venta; }
    public Articulo getArticulo() { return articulo; }
    public void setArticulo(Articulo articulo) { this.articulo = articulo; }
    public PresentacionArticulo getPresentacion() { return presentacion; }
    public void setPresentacion(PresentacionArticulo presentacion) { this.presentacion = presentacion; }
    public BigDecimal getCantidad() { return cantidad; }
    public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }
    public BigDecimal getPrecioUnitario() { return precioUnitario; }
    public void setPrecioUnitario(BigDecimal precioUnitario) { this.precioUnitario = precioUnitario; }
    public BigDecimal getCostoUnitario() { return costoUnitario; }
    public void setCostoUnitario(BigDecimal costoUnitario) { this.costoUnitario = costoUnitario; }
}
