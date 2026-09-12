package com.auroraplus.modules.repuestos.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Smart Restocking: borrador de orden de compra que el sistema arma solo
 * cuando una venta hace caer el stock de un ítem por debajo de su
 * stockMinimo (ver OrdenCompraSugeridaService). Nunca se envía nada al
 * proveedor automáticamente — queda en estado BORRADOR hasta que un
 * administrador la revise y decida aprobarla o descartarla.
 */
@Entity
@Table(name = "ordenes_compra_sugeridas")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class OrdenCompraSugerida {

    public enum Estado { BORRADOR, APROBADA, RECHAZADA }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "repuesto_id", nullable = false)
    private Long repuestoId;

    @Column(name = "proveedor_id")
    private Long proveedorId;

    @Column(name = "cantidad_sugerida", nullable = false, precision = 18, scale = 4)
    private BigDecimal cantidadSugerida;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Estado estado = Estado.BORRADOR;

    private String motivo;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Long getRepuestoId() { return repuestoId; }
    public void setRepuestoId(Long repuestoId) { this.repuestoId = repuestoId; }
    public Long getProveedorId() { return proveedorId; }
    public void setProveedorId(Long proveedorId) { this.proveedorId = proveedorId; }
    public BigDecimal getCantidadSugerida() { return cantidadSugerida; }
    public void setCantidadSugerida(BigDecimal cantidadSugerida) { this.cantidadSugerida = cantidadSugerida; }
    public Estado getEstado() { return estado; }
    public void setEstado(Estado estado) { this.estado = estado; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
