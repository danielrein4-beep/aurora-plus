package com.auroraplus.core.personal.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "seguimientos_meta")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class SeguimientoMeta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "meta_id", nullable = false)
    private Long metaId;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(name = "valor_alcanzado", nullable = false, precision = 18, scale = 4)
    private BigDecimal valorAlcanzado;

    private String nota;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Long getMetaId() { return metaId; }
    public void setMetaId(Long metaId) { this.metaId = metaId; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public BigDecimal getValorAlcanzado() { return valorAlcanzado; }
    public void setValorAlcanzado(BigDecimal valorAlcanzado) { this.valorAlcanzado = valorAlcanzado; }
    public String getNota() { return nota; }
    public void setNota(String nota) { this.nota = nota; }
}
