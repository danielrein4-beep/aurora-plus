package com.auroraplus.modules.ganaderia.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Ración diaria consumida por un potrero/lote — vincula el gasto de insumo con dónde y cuándo se dio. */
@Entity
@Table(name = "registros_consumo")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class RegistroConsumo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "insumo_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private InsumoAlimentacion insumo;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "potrero_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Potrero potrero;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false, precision = 18, scale = 4)
    private BigDecimal cantidad;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public InsumoAlimentacion getInsumo() { return insumo; }
    public void setInsumo(InsumoAlimentacion insumo) { this.insumo = insumo; }
    public Potrero getPotrero() { return potrero; }
    public void setPotrero(Potrero potrero) { this.potrero = potrero; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public BigDecimal getCantidad() { return cantidad; }
    public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }
}
