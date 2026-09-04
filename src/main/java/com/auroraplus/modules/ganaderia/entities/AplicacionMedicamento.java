package com.auroraplus.modules.ganaderia.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "aplicaciones_medicamento")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class AplicacionMedicamento {

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
    @JoinColumn(name = "medicamento_id", nullable = false)
    private Medicamento medicamento;

    @Column(name = "fecha_aplicacion", nullable = false)
    private LocalDate fechaAplicacion;

    private String dosis;

    @Column(name = "motivo_diagnostico")
    private String motivoDiagnostico;

    @Column(name = "veterinario_responsable")
    private String veterinarioResponsable;

    @Column(name = "fecha_fin_retiro_leche", nullable = false)
    private LocalDate fechaFinRetiroLeche;

    @Column(name = "fecha_fin_retiro_carne", nullable = false)
    private LocalDate fechaFinRetiroCarne;

    @Column(precision = 18, scale = 2)
    private BigDecimal costo;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Animal getAnimal() { return animal; }
    public void setAnimal(Animal animal) { this.animal = animal; }
    public Medicamento getMedicamento() { return medicamento; }
    public void setMedicamento(Medicamento medicamento) { this.medicamento = medicamento; }
    public LocalDate getFechaAplicacion() { return fechaAplicacion; }
    public void setFechaAplicacion(LocalDate fechaAplicacion) { this.fechaAplicacion = fechaAplicacion; }
    public String getDosis() { return dosis; }
    public void setDosis(String dosis) { this.dosis = dosis; }
    public String getMotivoDiagnostico() { return motivoDiagnostico; }
    public void setMotivoDiagnostico(String motivoDiagnostico) { this.motivoDiagnostico = motivoDiagnostico; }
    public String getVeterinarioResponsable() { return veterinarioResponsable; }
    public void setVeterinarioResponsable(String veterinarioResponsable) { this.veterinarioResponsable = veterinarioResponsable; }
    public LocalDate getFechaFinRetiroLeche() { return fechaFinRetiroLeche; }
    public void setFechaFinRetiroLeche(LocalDate fechaFinRetiroLeche) { this.fechaFinRetiroLeche = fechaFinRetiroLeche; }
    public LocalDate getFechaFinRetiroCarne() { return fechaFinRetiroCarne; }
    public void setFechaFinRetiroCarne(LocalDate fechaFinRetiroCarne) { this.fechaFinRetiroCarne = fechaFinRetiroCarne; }
    public BigDecimal getCosto() { return costo; }
    public void setCosto(BigDecimal costo) { this.costo = costo; }
}
