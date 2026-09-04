package com.auroraplus.modules.horeca.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "comandas")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Comanda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    // Nulo cuando el canal no usa mesa física (DELIVERY_PROPIO, RECOGER_EN_TIENDA).
    @Column(name = "numero_mesa")
    private Integer numeroMesa;

    @Column(nullable = false)
    private String mesero;

    // POS omnicanal (Front of House): SALON (mesa física), QR_MESA (pedido por
    // QR desde la mesa), DELIVERY_PROPIO (mensajería local — en San Cristóbal
    // no aplican agregadores como UberEats/Rappi, están muy poco extendidos),
    // RECOGER_EN_TIENDA.
    @Column(nullable = false, length = 20)
    private String canal = "SALON";

    private String nombreCliente;
    private String telefonoCliente;
    private String direccionEntrega;
    private String mensajero;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoComanda estado;

    @Column(name = "total_consumo", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalConsumo = BigDecimal.ZERO;

    @Column(name = "fecha_apertura", nullable = false)
    private LocalDateTime fechaApertura = LocalDateTime.now();

    @Column(name = "metodo_pago", length = 20)
    private String metodoPago; // EFECTIVO, TARJETA, TRANSFERENCIA, BILLETERA_DIGITAL

    @Column(name = "fecha_cierre")
    private LocalDateTime fechaCierre;

    public enum EstadoComanda { ABIERTA, PAGADA, ANULADA }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Integer getNumeroMesa() { return numeroMesa; }
    public void setNumeroMesa(Integer numeroMesa) { this.numeroMesa = numeroMesa; }
    public String getMesero() { return mesero; }
    public void setMesero(String mesero) { this.mesero = mesero; }
    public EstadoComanda getEstado() { return estado; }
    public void setEstado(EstadoComanda estado) { this.estado = estado; }
    public BigDecimal getTotalConsumo() { return totalConsumo; }
    public void setTotalConsumo(BigDecimal totalConsumo) { this.totalConsumo = totalConsumo; }
    public LocalDateTime getFechaApertura() { return fechaApertura; }
    public void setFechaApertura(LocalDateTime fechaApertura) { this.fechaApertura = fechaApertura; }
    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }
    public LocalDateTime getFechaCierre() { return fechaCierre; }
    public void setFechaCierre(LocalDateTime fechaCierre) { this.fechaCierre = fechaCierre; }
    public String getCanal() { return canal; }
    public void setCanal(String canal) { this.canal = canal; }
    public String getNombreCliente() { return nombreCliente; }
    public void setNombreCliente(String nombreCliente) { this.nombreCliente = nombreCliente; }
    public String getTelefonoCliente() { return telefonoCliente; }
    public void setTelefonoCliente(String telefonoCliente) { this.telefonoCliente = telefonoCliente; }
    public String getDireccionEntrega() { return direccionEntrega; }
    public void setDireccionEntrega(String direccionEntrega) { this.direccionEntrega = direccionEntrega; }
    public String getMensajero() { return mensajero; }
    public void setMensajero(String mensajero) { this.mensajero = mensajero; }
}
