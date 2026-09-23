package com.auroraplus.modules.comercio.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

// Sin este filtro, un pedidoWebRepository.findById(id) devuelve el pedido de
// CUALQUIER tenant — CatalogoGestionController.actualizarEstadoPedido ya
// validaba esto a mano comparando tenantId antes de tocar el registro, pero
// eso dependía de que cada endpoint nuevo se acuerde de repetir ese chequeo.
// Con el filtro activo (ver TenantFilterAspect/TenantInterceptor), findById
// queda aislado por tenant automáticamente, igual que el resto de entidades.
@Entity
@Table(name = "comercio_pedidos_web", indexes = {
    @Index(name = "idx_pedidos_web_tenant", columnList = "tenant_id, fecha_creacion DESC")
})
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
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

    // Opcional — si el cliente lo deja, se le manda el comprobante por correo
    // automáticamente en el momento en que el dueño confirma el pedido (ver
    // ConfirmacionPedidoWebService), no antes.
    @Column(name = "cliente_email", length = 255)
    private String clienteEmail;

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

    // JSON real (productoId/cantidad), a diferencia de itemsJson (texto de despliegue para
    // el humano) — lo usa ConfirmacionPedidoWebService para reproducir la venta contra el
    // inventario real al confirmar. Null en pedidos creados antes de esta columna.
    @Column(name = "items_estructurados_json", columnDefinition = "TEXT")
    private String itemsEstructuradosJson;

    @Column(columnDefinition = "TEXT")
    private String notas;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    // Token aleatorio devuelto SOLO al cliente que crea el pedido — es la única
    // credencial que puede adjuntar el comprobante de pago después (ver
    // subirComprobantePago en CatalogoPublicoController). Sin esto, cualquiera
    // podría adivinar el id numérico del pedido y subir/pisar el comprobante de
    // otra persona — numeroPedido ("PED-XXXX") no sirve para esto porque solo
    // tiene 9000 combinaciones y es adivinable por fuerza bruta.
    @Column(name = "access_token", length = 64)
    private String accessToken;

    @Column(name = "captura_pago_base64", columnDefinition = "TEXT")
    private String capturaPagoBase64;

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
    public String getClienteEmail() { return clienteEmail; }
    public void setClienteEmail(String clienteEmail) { this.clienteEmail = clienteEmail; }
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
    public String getItemsEstructuradosJson() { return itemsEstructuradosJson; }
    public void setItemsEstructuradosJson(String itemsEstructuradosJson) { this.itemsEstructuradosJson = itemsEstructuradosJson; }
    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }
    public String getCapturaPagoBase64() { return capturaPagoBase64; }
    public void setCapturaPagoBase64(String capturaPagoBase64) { this.capturaPagoBase64 = capturaPagoBase64; }
}
