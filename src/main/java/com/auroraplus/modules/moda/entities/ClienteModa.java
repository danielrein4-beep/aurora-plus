package com.auroraplus.modules.moda.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

/** Cliente de retail para fidelización (Subfase 6.3): acumula puntos por cada venta asociada. */
@Entity
@Table(name = "clientes_moda")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class ClienteModa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String nombre;

    private String cedula;
    private String telefono;

    @Column(name = "puntos_acumulados", nullable = false, precision = 18, scale = 2)
    private BigDecimal puntosAcumulados = BigDecimal.ZERO;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getCedula() { return cedula; }
    public void setCedula(String cedula) { this.cedula = cedula; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public BigDecimal getPuntosAcumulados() { return puntosAcumulados; }
    public void setPuntosAcumulados(BigDecimal puntosAcumulados) { this.puntosAcumulados = puntosAcumulados; }
}
