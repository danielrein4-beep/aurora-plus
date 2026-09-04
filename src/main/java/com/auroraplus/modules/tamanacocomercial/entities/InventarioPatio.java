package com.auroraplus.modules.tamanacocomercial.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Pila (lote) de acopio de mineral en el patio, asociada a una mina.
 * stockActual = toneladasEntrada - toneladasSalida.
 */
@Entity
@Table(name = "inventario_patio_comercial")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class InventarioPatio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String mina;

    @Column(name = "pila_acopio", nullable = false)
    private String pilaAcopio;

    @Column(name = "toneladas_entrada", precision = 18, scale = 4)
    private BigDecimal toneladasEntrada = BigDecimal.ZERO;

    @Column(name = "toneladas_salida", precision = 18, scale = 4)
    private BigDecimal toneladasSalida = BigDecimal.ZERO;

    @Column(name = "stock_actual", precision = 18, scale = 4)
    private BigDecimal stockActual = BigDecimal.ZERO;

    @Column(name = "capacidad_maxima_ton", precision = 18, scale = 4)
    private BigDecimal capacidadMaximaTon = new BigDecimal("500.0000");

    @Column(name = "fecha_ultimo_movimiento")
    private LocalDateTime fechaUltimoMovimiento;

    public void recalcularStock() {
        BigDecimal entrada = toneladasEntrada != null ? toneladasEntrada : BigDecimal.ZERO;
        BigDecimal salida = toneladasSalida != null ? toneladasSalida : BigDecimal.ZERO;
        this.stockActual = entrada.subtract(salida);
        this.fechaUltimoMovimiento = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getMina() { return mina; }
    public void setMina(String mina) { this.mina = mina != null ? mina.trim().toUpperCase() : null; }
    public String getPilaAcopio() { return pilaAcopio; }
    public void setPilaAcopio(String pilaAcopio) { this.pilaAcopio = pilaAcopio; }
    public BigDecimal getToneladasEntrada() { return toneladasEntrada; }
    public void setToneladasEntrada(BigDecimal toneladasEntrada) { this.toneladasEntrada = toneladasEntrada; }
    public BigDecimal getToneladasSalida() { return toneladasSalida; }
    public void setToneladasSalida(BigDecimal toneladasSalida) { this.toneladasSalida = toneladasSalida; }
    public BigDecimal getStockActual() { return stockActual; }
    public void setStockActual(BigDecimal stockActual) { this.stockActual = stockActual; }
    public BigDecimal getCapacidadMaximaTon() { return capacidadMaximaTon; }
    public void setCapacidadMaximaTon(BigDecimal capacidadMaximaTon) { this.capacidadMaximaTon = capacidadMaximaTon; }
    public LocalDateTime getFechaUltimoMovimiento() { return fechaUltimoMovimiento; }
    public void setFechaUltimoMovimiento(LocalDateTime fechaUltimoMovimiento) { this.fechaUltimoMovimiento = fechaUltimoMovimiento; }
}
