package com.auroraplus.core.inventario.entities;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Conteo físico ciego del inventario: el responsable cuenta lo que hay en el
 * estante SIN ver el stock teórico del sistema (para que el conteo sea
 * honesto, igual que el arqueo de caja ciego). Al cerrar, la brecha
 * (stockFisico - stockTeorico) queda expuesta por artículo — pérdidas por
 * robo, mermas no registradas, o porciones mal servidas.
 */
@Entity
@Table(name = "conteos_fisicos")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class ConteoFisico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String responsable;

    @Column(nullable = false, length = 15)
    private String estado = "ABIERTO"; // ABIERTO, CERRADO

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDateTime fechaInicio = LocalDateTime.now();

    @Column(name = "fecha_cierre")
    private LocalDateTime fechaCierre;

    @OneToMany(mappedBy = "conteo", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<DetalleConteoFisico> detalles = new ArrayList<>();

    public void addDetalle(DetalleConteoFisico detalle) {
        detalles.add(detalle);
        detalle.setConteo(this);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getResponsable() { return responsable; }
    public void setResponsable(String responsable) { this.responsable = responsable; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public LocalDateTime getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(LocalDateTime fechaInicio) { this.fechaInicio = fechaInicio; }
    public LocalDateTime getFechaCierre() { return fechaCierre; }
    public void setFechaCierre(LocalDateTime fechaCierre) { this.fechaCierre = fechaCierre; }
    public List<DetalleConteoFisico> getDetalles() { return detalles; }
    public void setDetalles(List<DetalleConteoFisico> detalles) { this.detalles = detalles; }
}
