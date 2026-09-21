package com.auroraplus.modules.ganaderia.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Configuración geográfica compartida de una finca. Es una sola ficha por
 * tenant: no se guarda en el navegador, por lo que el dueño y su equipo ven
 * el mismo punto de referencia desde cualquier dispositivo.
 */
@Entity
@Table(name = "fincas_ganaderia", uniqueConstraints = @UniqueConstraint(
    name = "uk_finca_ganaderia_tenant", columnNames = "tenant_id"))
public class FincaGanaderia {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false, length = 160)
    private String nombre;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitud;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitud;

    /** JSON de instalaciones reales: manga, ordeño, agua, silo, casa, etc. */
    @Column(name = "puntos_interes_json", columnDefinition = "TEXT")
    private String puntosInteresJson = "[]";

    @Column(name = "actualizado_en", nullable = false)
    private LocalDateTime actualizadoEn = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public BigDecimal getLatitud() { return latitud; }
    public void setLatitud(BigDecimal latitud) { this.latitud = latitud; }
    public BigDecimal getLongitud() { return longitud; }
    public void setLongitud(BigDecimal longitud) { this.longitud = longitud; }
    public String getPuntosInteresJson() { return puntosInteresJson; }
    public void setPuntosInteresJson(String puntosInteresJson) { this.puntosInteresJson = puntosInteresJson; }
    public LocalDateTime getActualizadoEn() { return actualizadoEn; }
    public void setActualizadoEn(LocalDateTime actualizadoEn) { this.actualizadoEn = actualizadoEn; }
}
