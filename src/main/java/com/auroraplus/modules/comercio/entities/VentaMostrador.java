package com.auroraplus.modules.comercio.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Detalle de una venta del POS de Comercio (líneas, pagos, cliente). Antes solo
 * existía en el localStorage del navegador: abrir el sistema desde otro equipo o
 * limpiar datos borraba todo el historial. El asiento de caja de la venta ya vivía
 * en el servidor (MovimientoCaja); esto guarda el detalle que le faltaba.
 *
 * detalleJson conserva la venta completa tal como la arma el POS, para no
 * reinventar cada campo; las columnas sueltas sirven para ordenar/consultar.
 */
@Entity
@Table(name = "ventas_mostrador", uniqueConstraints = @UniqueConstraint(columnNames = {"tenant_id", "numero"}))
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class VentaMostrador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false, length = 40)
    private String numero;

    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    @Column(name = "cliente_nombre", length = 160)
    private String clienteNombre;

    @Column(name = "cliente_documento", length = 60)
    private String clienteDocumento;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(precision = 18, scale = 2)
    private BigDecimal utilidad;

    @Column(name = "metodo_pago", length = 40)
    private String metodoPago;

    @Column(name = "es_credito", nullable = false)
    private Boolean esCredito = false;

    @Column(name = "detalle_json", nullable = false, columnDefinition = "TEXT")
    private String detalleJson;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }
    public LocalDateTime getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(LocalDateTime fechaRegistro) { this.fechaRegistro = fechaRegistro; }
    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }
    public String getClienteDocumento() { return clienteDocumento; }
    public void setClienteDocumento(String clienteDocumento) { this.clienteDocumento = clienteDocumento; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public BigDecimal getUtilidad() { return utilidad; }
    public void setUtilidad(BigDecimal utilidad) { this.utilidad = utilidad; }
    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }
    public Boolean getEsCredito() { return esCredito; }
    public void setEsCredito(Boolean esCredito) { this.esCredito = esCredito; }
    public String getDetalleJson() { return detalleJson; }
    public void setDetalleJson(String detalleJson) { this.detalleJson = detalleJson; }
}
