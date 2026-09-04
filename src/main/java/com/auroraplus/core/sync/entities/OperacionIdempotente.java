package com.auroraplus.core.sync.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Fase 8 (Offline-First) — deduplicación de operaciones reenviadas.
 *
 * Un POS que trabaja offline guarda la venta localmente con una clave única
 * generada en el propio dispositivo (ej. un UUID) y la reenvía al reconectar.
 * Si esa venta SÍ llegó a registrarse antes de que se cortara la conexión
 * (la respuesta se perdió, no la petición), un reintento normal duplicaría la
 * venta, el descuento de inventario y el ingreso en caja. Esta tabla es el
 * registro de "esta clave ya se procesó, y esto fue lo que resultó" — ver
 * IdempotenciaService, que es lo que consultan los servicios de venta antes
 * de hacer cualquier trabajo real.
 */
@Entity
@Table(name = "operaciones_idempotentes", uniqueConstraints = @UniqueConstraint(columnNames = {"tenant_id", "clave_idempotencia"}))
public class OperacionIdempotente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    // Generada por el cliente (POS) al crear la operación localmente, antes de
    // saber si hay conexión — típicamente un UUID. Debe ser la MISMA en todos
    // los reintentos de una misma venta.
    @Column(name = "clave_idempotencia", nullable = false, length = 100)
    private String claveIdempotencia;

    // Identifica qué tipo de operación fue, para poder interpretar entidadId
    // (ej. "venta_horeca" -> Comanda.id, "venta_minero" -> VentaMineral.id).
    @Column(name = "tipo_operacion", nullable = false, length = 60)
    private String tipoOperacion;

    @Column(name = "entidad_id", nullable = false)
    private Long entidadId;

    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getClaveIdempotencia() { return claveIdempotencia; }
    public void setClaveIdempotencia(String claveIdempotencia) { this.claveIdempotencia = claveIdempotencia; }
    public String getTipoOperacion() { return tipoOperacion; }
    public void setTipoOperacion(String tipoOperacion) { this.tipoOperacion = tipoOperacion; }
    public Long getEntidadId() { return entidadId; }
    public void setEntidadId(Long entidadId) { this.entidadId = entidadId; }
    public LocalDateTime getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(LocalDateTime fechaRegistro) { this.fechaRegistro = fechaRegistro; }
}
