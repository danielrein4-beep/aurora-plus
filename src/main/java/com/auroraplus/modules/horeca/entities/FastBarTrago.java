package com.auroraplus.modules.horeca.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

@Entity
@Table(name = "fastbar_tragos")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class FastBarTrago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "nombre_trago", nullable = false)
    private String nombreTrago;

    @Column(name = "botella_sku", nullable = false)
    private String botellaSku;

    @Column(name = "mililitros_por_trago", nullable = false, precision = 18, scale = 4)
    private BigDecimal mililitrosPorTrago;

    @Column(name = "precio_venta", nullable = false, precision = 18, scale = 2)
    private BigDecimal precioVenta;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombreTrago() { return nombreTrago; }
    public void setNombreTrago(String nombreTrago) { this.nombreTrago = nombreTrago; }
    public String getBotellaSku() { return botellaSku; }
    public void setBotellaSku(String botellaSku) { this.botellaSku = botellaSku; }
    public BigDecimal getMililitrosPorTrago() { return mililitrosPorTrago; }
    public void setMililitrosPorTrago(BigDecimal mililitrosPorTrago) { this.mililitrosPorTrago = mililitrosPorTrago; }
    public BigDecimal getPrecioVenta() { return precioVenta; }
    public void setPrecioVenta(BigDecimal precioVenta) { this.precioVenta = precioVenta; }
}
