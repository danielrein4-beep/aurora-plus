package com.auroraplus.modules.ganaderia.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "ventas_leche_tanque")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class VentaLecheTanque {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(name = "litros_vendidos", nullable = false, precision = 12, scale = 2)
    private BigDecimal litrosVendidos;

    @Column(name = "precio_litro_usd", nullable = false, precision = 10, scale = 4)
    private BigDecimal precioLitroUSD;

    @Column(name = "total_usd", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalUSD;

    @Column(name = "comprador_o_planta", nullable = false, length = 255)
    private String compradorOPlanta;

    @Column(name = "moneda_pago", length = 20)
    private String monedaPago = "USD";

    @Column(columnDefinition = "TEXT")
    private String notas;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public BigDecimal getLitrosVendidos() { return litrosVendidos; }
    public void setLitrosVendidos(BigDecimal litrosVendidos) { this.litrosVendidos = litrosVendidos; }
    public BigDecimal getPrecioLitroUSD() { return precioLitroUSD; }
    public void setPrecioLitroUSD(BigDecimal precioLitroUSD) { this.precioLitroUSD = precioLitroUSD; }
    public BigDecimal getTotalUSD() { return totalUSD; }
    public void setTotalUSD(BigDecimal totalUSD) { this.totalUSD = totalUSD; }
    public String getCompradorOPlanta() { return compradorOPlanta; }
    public void setCompradorOPlanta(String compradorOPlanta) { this.compradorOPlanta = compradorOPlanta; }
    public String getMonedaPago() { return monedaPago; }
    public void setMonedaPago(String monedaPago) { this.monedaPago = monedaPago; }
    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
