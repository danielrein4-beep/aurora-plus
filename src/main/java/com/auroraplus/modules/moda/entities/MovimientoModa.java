package com.auroraplus.modules.moda.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Kárdex de Moda: mismo patrón que MovimientoRepuesto, a nivel de variante (Talla+Color). */
@Entity
@Table(name = "movimientos_moda")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class MovimientoModa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "variante_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private VarianteModa variante;

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

    public enum TipoMovimiento { COMPRA, VENTA, AJUSTE }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public VarianteModa getVariante() { return variante; }
    public void setVariante(VarianteModa variante) { this.variante = variante; }
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
}
