package com.auroraplus.core.inventario.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

/**
 * Presentación de compra fraccionada de un artículo (ej. "Six-pack" = 6
 * unidades, "Bolsa x30" = 30 unidades) — el stock SIEMPRE se lleva en la
 * unidad base del artículo (Articulo.unidadMedida); esto es solo la
 * conversión para poder comprar/registrar en la unidad real en que llega la
 * mercancía, sin tener que hacer la cuenta a mano cada vez.
 */
@Entity
@Table(name = "presentaciones_articulo")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class PresentacionArticulo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "articulo_id", nullable = false)
    private Articulo articulo;

    @Column(nullable = false)
    private String nombre; // ej. "Six-pack", "Bolsa x30", "Caja x24"

    @Column(name = "unidades_por_presentacion", nullable = false, precision = 18, scale = 4)
    private BigDecimal unidadesPorPresentacion;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Articulo getArticulo() { return articulo; }
    public void setArticulo(Articulo articulo) { this.articulo = articulo; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public BigDecimal getUnidadesPorPresentacion() { return unidadesPorPresentacion; }
    public void setUnidadesPorPresentacion(BigDecimal unidadesPorPresentacion) { this.unidadesPorPresentacion = unidadesPorPresentacion; }
}
