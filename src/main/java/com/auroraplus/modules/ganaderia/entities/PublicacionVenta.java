package com.auroraplus.modules.ganaderia.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Publicación interna de un animal en venta — registro de negociación, no un portal público. */
@Entity
@Table(name = "publicaciones_venta")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class PublicacionVenta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "animal_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Animal animal;

    @Column(name = "precio_solicitado", nullable = false, precision = 18, scale = 2)
    private BigDecimal precioSolicitado;

    private String descripcion;

    @Column(nullable = false, length = 15)
    private String estado = "ACTIVA"; // ACTIVA, VENDIDA, RETIRADA

    @Column(name = "fecha_publicacion", nullable = false)
    private LocalDate fechaPublicacion = LocalDate.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Animal getAnimal() { return animal; }
    public void setAnimal(Animal animal) { this.animal = animal; }
    public BigDecimal getPrecioSolicitado() { return precioSolicitado; }
    public void setPrecioSolicitado(BigDecimal precioSolicitado) { this.precioSolicitado = precioSolicitado; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public LocalDate getFechaPublicacion() { return fechaPublicacion; }
    public void setFechaPublicacion(LocalDate fechaPublicacion) { this.fechaPublicacion = fechaPublicacion; }
}
