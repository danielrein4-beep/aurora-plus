package com.auroraplus.modules.ganaderia.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Aplicación real de una vacuna a un animal. fechaFinRetiroLeche/Carne se
 * calculan automáticamente al registrar (fechaAplicacion + días de retiro del
 * catálogo) — es la pieza sanitaria obligatoria que faltaba: sin esto el
 * sistema no avisa cuándo un animal vuelve a estar apto para venta/consumo.
 */
@Entity
@Table(name = "aplicaciones_vacuna")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class AplicacionVacuna {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "animal_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Animal animal;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "vacuna_id", nullable = false)
    private Vacuna vacuna;

    @Column(name = "fecha_aplicacion", nullable = false)
    private LocalDate fechaAplicacion;

    private String lote;

    @Column(name = "veterinario_responsable")
    private String veterinarioResponsable;

    @Column(name = "fecha_proxima_dosis")
    private LocalDate fechaProximaDosis;

    @Column(name = "fecha_fin_retiro_leche", nullable = false)
    private LocalDate fechaFinRetiroLeche;

    @Column(name = "fecha_fin_retiro_carne", nullable = false)
    private LocalDate fechaFinRetiroCarne;

    // Costo real de esta aplicación (dosis + visita veterinaria si aplica) — base del costeo por animal.
    @Column(precision = 18, scale = 2)
    private BigDecimal costo;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Animal getAnimal() { return animal; }
    public void setAnimal(Animal animal) { this.animal = animal; }
    public Vacuna getVacuna() { return vacuna; }
    public void setVacuna(Vacuna vacuna) { this.vacuna = vacuna; }
    public LocalDate getFechaAplicacion() { return fechaAplicacion; }
    public void setFechaAplicacion(LocalDate fechaAplicacion) { this.fechaAplicacion = fechaAplicacion; }
    public String getLote() { return lote; }
    public void setLote(String lote) { this.lote = lote; }
    public String getVeterinarioResponsable() { return veterinarioResponsable; }
    public void setVeterinarioResponsable(String veterinarioResponsable) { this.veterinarioResponsable = veterinarioResponsable; }
    public LocalDate getFechaProximaDosis() { return fechaProximaDosis; }
    public void setFechaProximaDosis(LocalDate fechaProximaDosis) { this.fechaProximaDosis = fechaProximaDosis; }
    public LocalDate getFechaFinRetiroLeche() { return fechaFinRetiroLeche; }
    public void setFechaFinRetiroLeche(LocalDate fechaFinRetiroLeche) { this.fechaFinRetiroLeche = fechaFinRetiroLeche; }
    public LocalDate getFechaFinRetiroCarne() { return fechaFinRetiroCarne; }
    public void setFechaFinRetiroCarne(LocalDate fechaFinRetiroCarne) { this.fechaFinRetiroCarne = fechaFinRetiroCarne; }
    public BigDecimal getCosto() { return costo; }
    public void setCosto(BigDecimal costo) { this.costo = costo; }
}
