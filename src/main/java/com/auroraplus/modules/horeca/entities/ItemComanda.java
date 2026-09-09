package com.auroraplus.modules.horeca.entities;

import com.auroraplus.core.inventario.entities.Articulo;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "items_comanda")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class ItemComanda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comanda_id", nullable = false)
    private Comanda comanda;

    // Nulo para cargos manuales sin receta (ej. "Cover", propina sugerida). Cuando
    // está presente, agregar el ítem descuenta automáticamente sus ingredientes.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "escandallo_id")
    private EscandalloReceta escandallo;

    @Column(name = "nombre_plato", nullable = false)
    private String nombrePlato;

    @Column(name = "estacion_cocina", nullable = false)
    private String estacionCocina; // Ej: PARRILLA, BAR, COCINA_FRIA

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_item", nullable = false, length = 20)
    private EstadoItem estadoItem;

    // BigDecimal (no Integer) para poder vender por peso/volumen fraccionario
    // (ej. 2.5 kg de harina, 1.5 L de aceite), no solo por unidades enteras.
    @Column(nullable = false, precision = 18, scale = 4)
    private BigDecimal cantidad;

    @Column(name = "precio_unitario", nullable = false, precision = 18, scale = 2)
    private BigDecimal precioUnitario;

    // Presente cuando este ítem es la venta directa de un artículo de
    // inventario (ej. Doritos, refresco) en vez de un plato con escandallo.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "articulo_id")
    private Articulo articulo;

    // Presente cuando este ítem es un trago de Fast-Bar (ver FastBarTrago) —
    // vender uno descuenta los mililitros correspondientes de su botella en
    // inventario. Antes esta venta pasaba por un endpoint aparte
    // (FastBarController/vender) que descontaba inventario pero no dejaba
    // ticket ni aparecía en reportes; unificado acá, en el mismo flujo de
    // agregarItemComanda que usan escandallo y articulo.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fast_bar_trago_id")
    private FastBarTrago fastBarTrago;

    // Costo por unidad CONGELADO al momento de la venta (del escandallo o del
    // artículo de inventario) — no se recalcula después aunque cambien costos
    // de insumos o compras, para que el reporte de utilidad de un día no
    // cambie retroactivamente. Nulo para cargos manuales sin costo conocido
    // (ej. "Cover"), que quedan fuera del reporte de utilidad.
    @Column(name = "costo_unitario", precision = 18, scale = 4)
    private BigDecimal costoUnitario;

    // Para el temporizador visual del KDS (verde/amarillo/rojo según minutos
    // esperando) — antes no existía ningún registro de cuándo entró el plato.
    // columnDefinition con default: sin esto, el ALTER TABLE sobre una tabla
    // con filas existentes revienta (NOT NULL sin valor para lo ya cargado).
    @Column(name = "fecha_creacion", nullable = false, columnDefinition = "timestamp default now()")
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    public enum EstadoItem { PENDIENTE, PREPARANDO, LISTO, ENTREGADO }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Comanda getComanda() { return comanda; }
    public void setComanda(Comanda comanda) { this.comanda = comanda; }
    public EscandalloReceta getEscandallo() { return escandallo; }
    public void setEscandallo(EscandalloReceta escandallo) { this.escandallo = escandallo; }
    public String getNombrePlato() { return nombrePlato; }
    public void setNombrePlato(String nombrePlato) { this.nombrePlato = nombrePlato; }
    public String getEstacionCocina() { return estacionCocina; }
    public void setEstacionCocina(String estacionCocina) { this.estacionCocina = estacionCocina; }
    public EstadoItem getEstadoItem() { return estadoItem; }
    public void setEstadoItem(EstadoItem estadoItem) { this.estadoItem = estadoItem; }
    public BigDecimal getCantidad() { return cantidad; }
    public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }
    public BigDecimal getPrecioUnitario() { return precioUnitario; }
    public void setPrecioUnitario(BigDecimal precioUnitario) { this.precioUnitario = precioUnitario; }
    public Articulo getArticulo() { return articulo; }
    public void setArticulo(Articulo articulo) { this.articulo = articulo; }
    public FastBarTrago getFastBarTrago() { return fastBarTrago; }
    public void setFastBarTrago(FastBarTrago fastBarTrago) { this.fastBarTrago = fastBarTrago; }
    public BigDecimal getCostoUnitario() { return costoUnitario; }
    public void setCostoUnitario(BigDecimal costoUnitario) { this.costoUnitario = costoUnitario; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
