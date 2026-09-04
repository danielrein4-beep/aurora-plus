package com.auroraplus.modules.tamanacocomercial.entities;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Venta comercial tri-moneda (USD/COP/VES), adaptada del proyecto "inventario".
 * Se apoya en el mismo principio del Motor Financiero Tri-Moneda de Aurora+
 * (core.financiero), pero como encabezado de venta propio de este módulo.
 */
@Entity
@Table(name = "ventas_comerciales")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class VentaComercial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "numero_ticket", nullable = false, length = 30)
    private String numeroTicket;

    @Column(nullable = false)
    private String cliente;

    private String notas;

    @Column(name = "total_usd", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalUsd = BigDecimal.ZERO;

    @Column(name = "total_cop", precision = 18, scale = 2)
    private BigDecimal totalCop;

    @Column(name = "total_ves", precision = 18, scale = 2)
    private BigDecimal totalVes;

    @Column(name = "tasa_cop", precision = 18, scale = 4)
    private BigDecimal tasaCop;

    @Column(name = "tasa_ves", precision = 18, scale = 4)
    private BigDecimal tasaVes;

    @Column(name = "metodo_pago", length = 30)
    private String metodoPago; // USD_EFECTIVO, COP_EFECTIVO, VES_PAGO_MOVIL, VES_EFECTIVO, ZELLE, MIXTO

    @Column(name = "moneda_cobro", nullable = false, length = 3)
    private String monedaCobro; // USD, COP, VES

    @Column(name = "monto_recibido", precision = 18, scale = 2)
    private BigDecimal montoRecibido;

    @Column(name = "monto_cambio", precision = 18, scale = 2)
    private BigDecimal montoCambio;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoVenta estado = EstadoVenta.COMPLETADA;

    @Column(nullable = false)
    private LocalDateTime fecha = LocalDateTime.now();

    @OneToMany(mappedBy = "venta", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<DetalleVentaComercial> items = new ArrayList<>();

    public enum EstadoVenta { COMPLETADA, ANULADA }

    public void addItem(DetalleVentaComercial item) {
        items.add(item);
        item.setVenta(this);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNumeroTicket() { return numeroTicket; }
    public void setNumeroTicket(String numeroTicket) { this.numeroTicket = numeroTicket; }
    public String getCliente() { return cliente; }
    public void setCliente(String cliente) { this.cliente = cliente; }
    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
    public BigDecimal getTotalUsd() { return totalUsd; }
    public void setTotalUsd(BigDecimal totalUsd) { this.totalUsd = totalUsd; }
    public BigDecimal getTotalCop() { return totalCop; }
    public void setTotalCop(BigDecimal totalCop) { this.totalCop = totalCop; }
    public BigDecimal getTotalVes() { return totalVes; }
    public void setTotalVes(BigDecimal totalVes) { this.totalVes = totalVes; }
    public BigDecimal getTasaCop() { return tasaCop; }
    public void setTasaCop(BigDecimal tasaCop) { this.tasaCop = tasaCop; }
    public BigDecimal getTasaVes() { return tasaVes; }
    public void setTasaVes(BigDecimal tasaVes) { this.tasaVes = tasaVes; }
    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }
    public String getMonedaCobro() { return monedaCobro; }
    public void setMonedaCobro(String monedaCobro) { this.monedaCobro = monedaCobro; }
    public BigDecimal getMontoRecibido() { return montoRecibido; }
    public void setMontoRecibido(BigDecimal montoRecibido) { this.montoRecibido = montoRecibido; }
    public BigDecimal getMontoCambio() { return montoCambio; }
    public void setMontoCambio(BigDecimal montoCambio) { this.montoCambio = montoCambio; }
    public EstadoVenta getEstado() { return estado; }
    public void setEstado(EstadoVenta estado) { this.estado = estado; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public List<DetalleVentaComercial> getItems() { return items; }
    public void setItems(List<DetalleVentaComercial> items) { this.items = items; }
}
