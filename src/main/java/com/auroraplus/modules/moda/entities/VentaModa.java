package com.auroraplus.modules.moda.entities;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "ventas_moda")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class VentaModa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "numero_ticket", nullable = false, length = 30)
    private String numeroTicket;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id")
    private ClienteModa cliente;

    @Column(name = "metodo_pago", nullable = false, length = 20)
    private String metodoPago; // EFECTIVO, GIFT_CARD

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gift_card_id")
    private GiftCard giftCardUsada;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(name = "puntos_otorgados", nullable = false, precision = 18, scale = 2)
    private BigDecimal puntosOtorgados = BigDecimal.ZERO;

    @Column(nullable = false)
    private LocalDateTime fecha = LocalDateTime.now();

    @OneToMany(mappedBy = "venta", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<DetalleVentaModa> items = new ArrayList<>();

    public void addItem(DetalleVentaModa item) {
        items.add(item);
        item.setVenta(this);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNumeroTicket() { return numeroTicket; }
    public void setNumeroTicket(String numeroTicket) { this.numeroTicket = numeroTicket; }
    public ClienteModa getCliente() { return cliente; }
    public void setCliente(ClienteModa cliente) { this.cliente = cliente; }
    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }
    public GiftCard getGiftCardUsada() { return giftCardUsada; }
    public void setGiftCardUsada(GiftCard giftCardUsada) { this.giftCardUsada = giftCardUsada; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public BigDecimal getPuntosOtorgados() { return puntosOtorgados; }
    public void setPuntosOtorgados(BigDecimal puntosOtorgados) { this.puntosOtorgados = puntosOtorgados; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public List<DetalleVentaModa> getItems() { return items; }
    public void setItems(List<DetalleVentaModa> items) { this.items = items; }
}
