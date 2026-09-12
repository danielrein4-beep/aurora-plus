package com.auroraplus.modules.ganaderia.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "tanques_leche")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class TanqueLeche {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "stock_actual_litros", nullable = false, precision = 12, scale = 2)
    private BigDecimal stockActualLitros = BigDecimal.ZERO;

    @Column(name = "capacidad_litros", precision = 12, scale = 2)
    private BigDecimal capacidadLitros = BigDecimal.valueOf(2000.00);

    @Column(name = "temperatura_celsius", precision = 5, scale = 2)
    private BigDecimal temperaturaCelsius = BigDecimal.valueOf(4.0);

    @Column(name = "ultima_actualizacion")
    private LocalDateTime ultimaActualizacion = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public BigDecimal getStockActualLitros() { return stockActualLitros != null ? stockActualLitros : BigDecimal.ZERO; }
    public void setStockActualLitros(BigDecimal stockActualLitros) { this.stockActualLitros = stockActualLitros; }
    public BigDecimal getCapacidadLitros() { return capacidadLitros; }
    public void setCapacidadLitros(BigDecimal capacidadLitros) { this.capacidadLitros = capacidadLitros; }
    public BigDecimal getTemperaturaCelsius() { return temperaturaCelsius; }
    public void setTemperaturaCelsius(BigDecimal temperaturaCelsius) { this.temperaturaCelsius = temperaturaCelsius; }
    public LocalDateTime getUltimaActualizacion() { return ultimaActualizacion; }
    public void setUltimaActualizacion(LocalDateTime ultimaActualizacion) { this.ultimaActualizacion = ultimaActualizacion; }
}
