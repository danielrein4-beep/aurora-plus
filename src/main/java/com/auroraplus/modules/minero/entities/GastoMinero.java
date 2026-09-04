package com.auroraplus.modules.minero.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Gasto operativo de la mina: herramientas (palas, carretillas), químicos
 * (clorato), mantenimiento de equipos, transporte — todo lo que se compra
 * para OPERAR, no para revender (a diferencia de Repuestos/Moda/Ganadería).
 */
@Entity
@Table(name = "gastos_minero")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class GastoMinero {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    // Libre pero sugerida: HERRAMIENTAS, QUIMICOS, MANTENIMIENTO, TRANSPORTE, SEGURIDAD, OTROS
    @Column(nullable = false, length = 30)
    private String categoria;

    @Column(nullable = false)
    private String descripcion;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal monto;

    @Column(nullable = false)
    private LocalDate fecha;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
}
