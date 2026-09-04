package com.auroraplus.modules.tamanacocomercial.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "historial_proveedores_comercial")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class HistorialProveedor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "proveedor_id", nullable = false)
    private Long proveedorId;

    @Column(nullable = false)
    private LocalDateTime fecha = LocalDateTime.now();

    // REGISTRO, GASTO, DESPACHO, PRESTAMO, NOTA, ACTUALIZACION
    @Column(name = "tipo_evento", nullable = false)
    private String tipoEvento = "REGISTRO";

    @Column(nullable = false, length = 1000)
    private String descripcion;

    @Column(precision = 18, scale = 2)
    private BigDecimal monto;

    private String moneda;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Long getProveedorId() { return proveedorId; }
    public void setProveedorId(Long proveedorId) { this.proveedorId = proveedorId; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public String getTipoEvento() { return tipoEvento; }
    public void setTipoEvento(String tipoEvento) { this.tipoEvento = tipoEvento; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }
}
