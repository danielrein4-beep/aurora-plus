package com.auroraplus.modules.comercio.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Renglón del libro de ventas: lo escribe el servidor al cobrar el ticket, en la misma
 * transacción (ver RepuestoConversionService.venderTicket), así que el navegador no puede
 * alterar el IVA ni el IGTF. Los montos van en la moneda base; tasaBcv los lleva a bolívares.
 */
@Entity
@Table(name = "libro_ventas", uniqueConstraints = @UniqueConstraint(columnNames = {"tenant_id", "numero_ticket"}))
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class LibroVenta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "numero_ticket", nullable = false, length = 40)
    private String numeroTicket;

    @Column(nullable = false)
    private LocalDateTime fecha = LocalDateTime.now();

    @Column(name = "cliente_nombre", length = 160)
    private String clienteNombre;

    @Column(name = "cliente_rif", length = 60)
    private String clienteRif;

    @Column(name = "numero_control", length = 30)
    private String numeroControl;

    @Column(name = "moneda_base", nullable = false, length = 3)
    private String monedaBase = "USD";

    @Column(name = "tasa_bcv", precision = 18, scale = 6)
    private BigDecimal tasaBcv;

    @Column(name = "monto_exento", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoExento = BigDecimal.ZERO;

    @Column(name = "base_imponible", nullable = false, precision = 18, scale = 2)
    private BigDecimal baseImponible = BigDecimal.ZERO;

    @Column(name = "alicuota_iva", nullable = false, precision = 5, scale = 2)
    private BigDecimal alicuotaIva = BigDecimal.ZERO;

    @Column(name = "monto_iva", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoIva = BigDecimal.ZERO;

    @Column(name = "monto_igtf", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoIgtf = BigDecimal.ZERO;

    @Column(name = "monto_delivery", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoDelivery = BigDecimal.ZERO;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(name = "iva_quitado", nullable = false)
    private Boolean ivaQuitado = false;

    @Column(name = "iva_quitado_por", length = 160)
    private String ivaQuitadoPor;

    @Column(name = "es_credito", nullable = false)
    private Boolean esCredito = false;

    public Long getId() { return id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNumeroTicket() { return numeroTicket; }
    public void setNumeroTicket(String numeroTicket) { this.numeroTicket = numeroTicket; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }
    public String getClienteRif() { return clienteRif; }
    public void setClienteRif(String clienteRif) { this.clienteRif = clienteRif; }
    public String getNumeroControl() { return numeroControl; }
    public void setNumeroControl(String numeroControl) { this.numeroControl = numeroControl; }
    public String getMonedaBase() { return monedaBase; }
    public void setMonedaBase(String monedaBase) { this.monedaBase = monedaBase; }
    public BigDecimal getTasaBcv() { return tasaBcv; }
    public void setTasaBcv(BigDecimal tasaBcv) { this.tasaBcv = tasaBcv; }
    public BigDecimal getMontoExento() { return montoExento; }
    public void setMontoExento(BigDecimal montoExento) { this.montoExento = montoExento; }
    public BigDecimal getBaseImponible() { return baseImponible; }
    public void setBaseImponible(BigDecimal baseImponible) { this.baseImponible = baseImponible; }
    public BigDecimal getAlicuotaIva() { return alicuotaIva; }
    public void setAlicuotaIva(BigDecimal alicuotaIva) { this.alicuotaIva = alicuotaIva; }
    public BigDecimal getMontoIva() { return montoIva; }
    public void setMontoIva(BigDecimal montoIva) { this.montoIva = montoIva; }
    public BigDecimal getMontoIgtf() { return montoIgtf; }
    public void setMontoIgtf(BigDecimal montoIgtf) { this.montoIgtf = montoIgtf; }
    public BigDecimal getMontoDelivery() { return montoDelivery; }
    public void setMontoDelivery(BigDecimal montoDelivery) { this.montoDelivery = montoDelivery; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public Boolean getIvaQuitado() { return ivaQuitado; }
    public void setIvaQuitado(Boolean ivaQuitado) { this.ivaQuitado = ivaQuitado; }
    public String getIvaQuitadoPor() { return ivaQuitadoPor; }
    public void setIvaQuitadoPor(String ivaQuitadoPor) { this.ivaQuitadoPor = ivaQuitadoPor; }
    public Boolean getEsCredito() { return esCredito; }
    public void setEsCredito(Boolean esCredito) { this.esCredito = esCredito; }
}
