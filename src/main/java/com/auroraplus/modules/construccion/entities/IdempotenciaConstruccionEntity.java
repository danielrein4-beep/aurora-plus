package com.auroraplus.modules.construccion.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "idempotencia_construccion", uniqueConstraints = {
    @UniqueConstraint(name = "uk_idemp_tenant_key", columnNames = {"tenant_id", "idempotency_key"})
})
public class IdempotenciaConstruccionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "idempotency_key", nullable = false, length = 100)
    private String idempotencyKey;

    @Column(name = "recurso_tipo", nullable = false, length = 50)
    private String recursoTipo;

    @Column(name = "recurso_id")
    private Long recursoId;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public IdempotenciaConstruccionEntity() {}

    public IdempotenciaConstruccionEntity(Long tenantId, String idempotencyKey, String recursoTipo, Long recursoId) {
        this.tenantId = tenantId;
        this.idempotencyKey = idempotencyKey;
        this.recursoTipo = recursoTipo;
        this.recursoId = recursoId;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }

    public String getRecursoTipo() { return recursoTipo; }
    public void setRecursoTipo(String recursoTipo) { this.recursoTipo = recursoTipo; }

    public Long getRecursoId() { return recursoId; }
    public void setRecursoId(Long recursoId) { this.recursoId = recursoId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
