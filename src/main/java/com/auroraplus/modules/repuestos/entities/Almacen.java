package com.auroraplus.modules.repuestos.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.time.LocalDateTime;

/**
 * Ubicación física donde vive inventario (Almacén Central, Sucursal Este, la
 * camioneta de reparto...). El stock TOTAL de cada RepuestoItem sigue siendo
 * la fuente de verdad para vender/kárdex (no se toca el motor existente); esto
 * es una capa aditiva que registra CÓMO se reparte ese total entre ubicaciones
 * — ver StockAlmacen. Todo negocio nuevo arranca con un único "Almacén
 * Central" marcado esPrincipal (ver AlmacenService.obtenerOCrearPrincipal),
 * así que un tenant que nunca usa multi-almacén ni lo nota.
 */
@Entity
@Table(name = "almacenes")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Almacen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(length = 255)
    private String direccion;

    @Column(name = "es_principal", nullable = false)
    private Boolean esPrincipal = false;

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getDireccion() { return direccion; }
    public void setDireccion(String direccion) { this.direccion = direccion; }
    public Boolean getEsPrincipal() { return esPrincipal; }
    public void setEsPrincipal(Boolean esPrincipal) { this.esPrincipal = esPrincipal; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
