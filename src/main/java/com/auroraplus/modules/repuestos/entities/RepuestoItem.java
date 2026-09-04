package com.auroraplus.modules.repuestos.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Ítem de catálogo de repuestos, optimizado para volúmenes masivos (>20,000
 * registros por tenant): los índices sobre codigoSku y codigoOriginalOem
 * (además del compuesto con tenant_id) son los que sostienen la velocidad de
 * búsqueda a ese volumen — sin ellos cada lookup degradaría a full scan.
 */
@Entity
@Table(name = "repuestos_items", indexes = {
    @Index(name = "idx_repuesto_tenant_sku", columnList = "tenant_id, codigo_sku"),
    @Index(name = "idx_repuesto_tenant_oem", columnList = "tenant_id, codigo_original_oem")
})
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class RepuestoItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "codigo_sku", nullable = false, length = 50)
    private String codigoSku;

    @Column(name = "codigo_original_oem", length = 50)
    private String codigoOriginalOem;

    @Column(nullable = false)
    private String descripcion;

    @Column(name = "stock_actual", nullable = false, precision = 18, scale = 4)
    private BigDecimal stockActual = BigDecimal.ZERO;

    @Column(name = "precio_venta", nullable = false, precision = 18, scale = 2)
    private BigDecimal precioVenta; // Precio Detal (por defecto, para ventas por debajo del umbral mayorista)

    @Column(name = "unidad_base", nullable = false, length = 20)
    private String unidadBase = "UNIDAD"; // Unidad en la que se lleva stockActual: UNIDAD, METRO, KILOGRAMO, etc.

    // Subfase 5.3 — Listas de Precios y Volumen: si se configuran ambos campos,
    // una venta con cantidad >= cantidadMinimaMayorista cobra precioMayorista
    // en vez de precioVenta (Detal), automáticamente.
    @Column(name = "precio_mayorista", precision = 18, scale = 2)
    private BigDecimal precioMayorista;

    @Column(name = "cantidad_minima_mayorista", precision = 18, scale = 4)
    private BigDecimal cantidadMinimaMayorista;

    // Costo de la última compra registrada (se actualiza automáticamente al
    // registrar una CompraRepuesto). Sirve para calcular margen real.
    @Column(name = "costo_unitario", precision = 18, scale = 2)
    private BigDecimal costoUnitario = BigDecimal.ZERO;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getCodigoSku() { return codigoSku; }
    public void setCodigoSku(String codigoSku) { this.codigoSku = codigoSku; }
    public String getCodigoOriginalOem() { return codigoOriginalOem; }
    public void setCodigoOriginalOem(String codigoOriginalOem) { this.codigoOriginalOem = codigoOriginalOem; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public BigDecimal getStockActual() { return stockActual; }
    public void setStockActual(BigDecimal stockActual) { this.stockActual = stockActual; }
    public BigDecimal getPrecioVenta() { return precioVenta; }
    public void setPrecioVenta(BigDecimal precioVenta) { this.precioVenta = precioVenta; }
    public String getUnidadBase() { return unidadBase; }
    public void setUnidadBase(String unidadBase) { this.unidadBase = unidadBase; }
    public BigDecimal getPrecioMayorista() { return precioMayorista; }
    public void setPrecioMayorista(BigDecimal precioMayorista) { this.precioMayorista = precioMayorista; }
    public BigDecimal getCantidadMinimaMayorista() { return cantidadMinimaMayorista; }
    public void setCantidadMinimaMayorista(BigDecimal cantidadMinimaMayorista) { this.cantidadMinimaMayorista = cantidadMinimaMayorista; }
    public BigDecimal getCostoUnitario() { return costoUnitario; }
    public void setCostoUnitario(BigDecimal costoUnitario) { this.costoUnitario = costoUnitario; }

    // ── Utilidad calculada (no persistida): se recalcula sola en cada
    // lectura a partir de precio y costo actuales, para que el usuario vea
    // de una vez cuánto gana con este producto al registrar/editar precios.
    @Transient
    public BigDecimal getUtilidadDetalUnitaria() {
        if (precioVenta == null || costoUnitario == null) return null;
        return precioVenta.subtract(costoUnitario);
    }

    @Transient
    public BigDecimal getUtilidadDetalPorcentual() {
        BigDecimal utilidad = getUtilidadDetalUnitaria();
        if (utilidad == null || costoUnitario == null || costoUnitario.compareTo(BigDecimal.ZERO) == 0) return null;
        return utilidad.divide(costoUnitario, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
    }

    @Transient
    public BigDecimal getUtilidadMayoristaUnitaria() {
        if (precioMayorista == null || costoUnitario == null) return null;
        return precioMayorista.subtract(costoUnitario);
    }

    @Transient
    public BigDecimal getUtilidadMayoristaPorcentual() {
        BigDecimal utilidad = getUtilidadMayoristaUnitaria();
        if (utilidad == null || costoUnitario == null || costoUnitario.compareTo(BigDecimal.ZERO) == 0) return null;
        return utilidad.divide(costoUnitario, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
    }
}
