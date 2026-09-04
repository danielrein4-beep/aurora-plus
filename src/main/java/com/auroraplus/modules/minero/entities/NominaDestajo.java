package com.auroraplus.modules.minero.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "nomina_destajo")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class NominaDestajo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "nombre_picador", nullable = false)
    private String nombrePicador;

    @Column(name = "toneladas_producidas", nullable = false, precision = 18, scale = 4)
    private BigDecimal toneladasProducidas;

    @Column(name = "tarifa_por_tonelada", nullable = false, precision = 18, scale = 4)
    private BigDecimal tarifaPorTonelada;

    @Column(name = "total_pagar", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalPagar;

    @Column(name = "fecha_liquidacion", nullable = false)
    private LocalDateTime fechaLiquidacion = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombrePicador() { return nombrePicador; }
    public void setNombrePicador(String nombrePicador) { this.nombrePicador = nombrePicador; }
    public BigDecimal getToneladasProducidas() { return toneladasProducidas; }
    public void setToneladasProducidas(BigDecimal toneladasProducidas) { this.toneladasProducidas = toneladasProducidas; }
    public BigDecimal getTarifaPorTonelada() { return tarifaPorTonelada; }
    public void setTarifaPorTonelada(BigDecimal tarifaPorTonelada) { this.tarifaPorTonelada = tarifaPorTonelada; }
    public BigDecimal getTotalPagar() { return totalPagar; }
    public void setTotalPagar(BigDecimal totalPagar) { this.totalPagar = totalPagar; }
    public LocalDateTime getFechaLiquidacion() { return fechaLiquidacion; }
    public void setFechaLiquidacion(LocalDateTime fechaLiquidacion) { this.fechaLiquidacion = fechaLiquidacion; }
}
