package com.auroraplus.modules.comercio.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "comercio_pedidos_web", indexes = {
    @Index(name = "idx_pedidos_web_tenant", columnList = "tenant_id, fecha_creacion DESC")
})
public class PedidoWebComercio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "numero_pedido", nullable = false, length = 40)
    private String numeroPedido;

    @Column(name = "cliente_nombre", nullable = false, length = 120)
    private String clienteNombre;

    @Column(name = "cliente_telefono", nullable = false, length = 40)
    private String clienteTelefono;

    @Column(name = "tipo_entrega", nullable = false, length = 30)
    private String tipoEntrega = "DELIVERY"; // DELIVERY o PICKUP

    @Column(name = "direccion_entrega", columnDefinition = "TEXT")
    private String direccionEntrega;

    @Column(name = "metodo_pago", nullable = false, length = 40)
    private String metodoPago = "PAGO_MOVIL";

    @Column(nullable = false, length = 30)
    private String estado = "PENDIENTE"; // PENDIENTE, EN_PREPARACION, DESPACHADO, ENTREGADO, CANCELADO

    @Column(name = "total_usd", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalUsd = BigDecimal.ZERO;

    @Column(name = "total_bs", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalBs = BigDecimal.ZERO;

    @Column(name = "tasa_cambio", nullable = false, precision = 18, scale = 4)
    private BigDecimal tasaCambio = BigDecimal.ONE;

    @Column(name = "items_json", nullable = false, columnDefinition = "TEXT")
    private String itemsJson;

    @Column(columnDefinition = "TEXT")
    private String notas;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNumeroPedido() { return numeroPedido; }
    public void setNumeroPedido(String numeroPedido) { this.numeroPedido = numeroPedido; }
    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }
    public String getClienteTelefono() { return clienteTelefono; }
    public void setClienteTelefono(String clienteTelefono) { this.clienteTelefono = clienteTelefono; }
    public String getTipoEntrega() { return tipoEntrega; }
    public void setTipoEntrega(String tipoEntrega) { this.tipoEntrega = tipoEntrega; }
    public String getDireccionEntrega() { return direccionEntrega; }
    public void setDireccionEntrega(String direccionEntrega) { this.direccionEntrega = direccionEntrega; }
    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public BigDecimal getTotalUsd() { return totalUsd; }
    public void setTotalUsd(BigDecimal totalUsd) { this.totalUsd = totalUsd; }
    public BigDecimal getTotalBs() { return totalBs; }
    public void setTotalBs(BigDecimal totalBs) { this.totalBs = totalBs; }
    public BigDecimal getTasaCambio() { return tasaCambio; }
    public void setTasaCambio(BigDecimal tasaCambio) { this.tasaCambio = tasaCambio; }
    public String getItemsJson() { return itemsJson; }
    public void setItemsJson(String itemsJson) { this.itemsJson = itemsJson; }
    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
