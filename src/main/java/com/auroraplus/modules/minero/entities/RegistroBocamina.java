package com.auroraplus.modules.minero.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "registros_bocamina")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class RegistroBocamina {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "frente_corte", nullable = false)
    private String frenteCorte;

    @Column(nullable = false)
    private String turno;

    @Column(name = "cantidad_vagonetas", nullable = false)
    private Integer cantidadVagonetas;

    @Column(name = "toneladas_estimadas", nullable = false, precision = 18, scale = 4)
    private BigDecimal toneladasEstimadas;

    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getFrenteCorte() { return frenteCorte; }
    public void setFrenteCorte(String frenteCorte) { this.frenteCorte = frenteCorte; }
    public String getTurno() { return turno; }
    public void setTurno(String turno) { this.turno = turno; }
    public Integer getCantidadVagonetas() { return cantidadVagonetas; }
    public void setCantidadVagonetas(Integer cantidadVagonetas) { this.cantidadVagonetas = cantidadVagonetas; }
    public BigDecimal getToneladasEstimadas() { return toneladasEstimadas; }
    public void setToneladasEstimadas(BigDecimal toneladasEstimadas) { this.toneladasEstimadas = toneladasEstimadas; }
    public LocalDateTime getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(LocalDateTime fechaRegistro) { this.fechaRegistro = fechaRegistro; }
}
