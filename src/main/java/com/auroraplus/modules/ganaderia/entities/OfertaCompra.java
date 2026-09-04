package com.auroraplus.modules.ganaderia.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "ofertas_compra")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class OfertaCompra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "publicacion_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private PublicacionVenta publicacion;

    @Column(name = "nombre_comprador", nullable = false)
    private String nombreComprador;

    @Column(name = "telefono_comprador")
    private String telefonoComprador;

    @Column(name = "monto_ofertado", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoOfertado;

    @Column(nullable = false)
    private LocalDate fecha = LocalDate.now();

    @Column(nullable = false, length = 15)
    private String estado = "PENDIENTE"; // PENDIENTE, ACEPTADA, RECHAZADA

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public PublicacionVenta getPublicacion() { return publicacion; }
    public void setPublicacion(PublicacionVenta publicacion) { this.publicacion = publicacion; }
    public String getNombreComprador() { return nombreComprador; }
    public void setNombreComprador(String nombreComprador) { this.nombreComprador = nombreComprador; }
    public String getTelefonoComprador() { return telefonoComprador; }
    public void setTelefonoComprador(String telefonoComprador) { this.telefonoComprador = telefonoComprador; }
    public BigDecimal getMontoOfertado() { return montoOfertado; }
    public void setMontoOfertado(BigDecimal montoOfertado) { this.montoOfertado = montoOfertado; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
}
