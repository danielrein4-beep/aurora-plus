package com.auroraplus.modules.tamanacocomercial.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cuotas_despacho_comercial")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class CuotaDespacho {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    private String cliente;

    @Column(name = "meta_toneladas", precision = 18, scale = 4)
    private BigDecimal metaToneladas;

    @Column(name = "toneladas_entregadas", precision = 18, scale = 4)
    private BigDecimal toneladasEntregadas = BigDecimal.ZERO;

    private String estado = "ACTIVA"; // ACTIVA, COMPLETADA
    private String periodo; // Ej: "Agosto 2026"

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getCliente() { return cliente; }
    public void setCliente(String cliente) { this.cliente = cliente; }
    public BigDecimal getMetaToneladas() { return metaToneladas; }
    public void setMetaToneladas(BigDecimal metaToneladas) { this.metaToneladas = metaToneladas; }
    public BigDecimal getToneladasEntregadas() { return toneladasEntregadas; }
    public void setToneladasEntregadas(BigDecimal toneladasEntregadas) { this.toneladasEntregadas = toneladasEntregadas; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public String getPeriodo() { return periodo; }
    public void setPeriodo(String periodo) { this.periodo = periodo; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
