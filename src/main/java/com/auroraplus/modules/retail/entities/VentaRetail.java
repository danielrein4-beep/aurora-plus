package com.auroraplus.modules.retail.entities;

import com.auroraplus.core.crm.entities.Cliente;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Venta de mostrador de Aurora Retail (Ferretería/Farmacia/Repuestos) — a
 * diferencia de la Comanda de Horeca (que queda ABIERTA mientras el cliente
 * come), una venta de mostrador es atómica: se escanea, se cobra y queda
 * cerrada en la misma transacción (ver RetailVentaService). No hay mesa ni
 * estado de cocina.
 */
@Entity
@Table(name = "ventas_retail")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class VentaRetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    // Opcional — mostrador también atiende venta anónima sin cliente asociado.
    // EAGER: mismo criterio que CompraRetail.proveedor — se serializa
    // directamente en las respuestas del POS/listados.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    @Column(nullable = false, precision = 18, scale = 4)
    private BigDecimal total;

    @Column(nullable = false, length = 10)
    private String moneda;

    // Venta "fiada": no se cobró en el momento, queda como cuenta por cobrar
    // en MotorFinancieroService en vez de ingreso inmediato de caja.
    @Column(name = "es_credito", nullable = false)
    private Boolean esCredito = false;

    @Column(name = "fecha_registro", nullable = false, columnDefinition = "timestamp default now()")
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Cliente getCliente() { return cliente; }
    public void setCliente(Cliente cliente) { this.cliente = cliente; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }
    public Boolean getEsCredito() { return esCredito; }
    public void setEsCredito(Boolean esCredito) { this.esCredito = esCredito; }
    public LocalDateTime getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(LocalDateTime fechaRegistro) { this.fechaRegistro = fechaRegistro; }
}
