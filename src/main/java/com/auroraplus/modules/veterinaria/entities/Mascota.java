package com.auroraplus.modules.veterinaria.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Period;

/**
 * Mascota (paciente animal) en la vertical Veterinaria.
 * Vinculada obligatoriamente a un Propietario.
 */
@Entity
@Table(name = "mascotas", indexes = {
    @Index(name = "idx_vet_mascotas_tenant", columnList = "tenant_id"),
    @Index(name = "idx_vet_mascotas_propietario", columnList = "tenant_id, propietario_id"),
    @Index(name = "idx_vet_mascotas_microchip", columnList = "tenant_id, microchip")
})
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Mascota {

    public enum EspecieMascota {
        PERRO,
        GATO,
        AVE,
        EXOTICO,
        OTRO
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "propietario_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Propietario propietario;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EspecieMascota especie = EspecieMascota.PERRO;

    @Column(length = 100)
    private String raza;

    @Column(length = 20)
    private String sexo; // MACHO, HEMBRA

    @Column(name = "fecha_nacimiento")
    private LocalDate fechaNacimiento;

    @Column(name = "edad_estimada", length = 50)
    private String edadEstimada;

    @Column(name = "color_senas", length = 150)
    private String colorSenas;

    @Column(name = "peso_actual_kg", precision = 6, scale = 2)
    private BigDecimal pesoActualKg;

    @Column(length = 50)
    private String microchip;

    @Column(nullable = false)
    private boolean esterilizado = false;

    @Column(columnDefinition = "TEXT")
    private String alergias;

    @Column(name = "antecedentes_patologicos", columnDefinition = "TEXT")
    private String antecedentesPatologicos;

    @Column(nullable = false)
    private boolean fallecido = false;

    @Column(nullable = false)
    private boolean activo = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Propietario getPropietario() { return propietario; }
    public void setPropietario(Propietario propietario) { this.propietario = propietario; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public EspecieMascota getEspecie() { return especie; }
    public void setEspecie(EspecieMascota especie) { this.especie = especie; }
    public String getRaza() { return raza; }
    public void setRaza(String raza) { this.raza = raza; }
    public String getSexo() { return sexo; }
    public void setSexo(String sexo) { this.sexo = sexo; }
    public LocalDate getFechaNacimiento() { return fechaNacimiento; }
    public void setFechaNacimiento(LocalDate fechaNacimiento) { this.fechaNacimiento = fechaNacimiento; }
    public String getEdadEstimada() { return edadEstimada; }
    public void setEdadEstimada(String edadEstimada) { this.edadEstimada = edadEstimada; }
    public String getColorSenas() { return colorSenas; }
    public void setColorSenas(String colorSenas) { this.colorSenas = colorSenas; }
    public BigDecimal getPesoActualKg() { return pesoActualKg; }
    public void setPesoActualKg(BigDecimal pesoActualKg) { this.pesoActualKg = pesoActualKg; }
    public String getMicrochip() { return microchip; }
    public void setMicrochip(String microchip) { this.microchip = microchip; }
    public boolean isEsterilizado() { return esterilizado; }
    public void setEsterilizado(boolean esterilizado) { this.esterilizado = esterilizado; }
    public String getAlergias() { return alergias; }
    public void setAlergias(String alergias) { this.alergias = alergias; }
    public String getAntecedentesPatologicos() { return antecedentesPatologicos; }
    public void setAntecedentesPatologicos(String antecedentesPatologicos) { this.antecedentesPatologicos = antecedentesPatologicos; }
    public boolean isFallecido() { return fallecido; }
    public void setFallecido(boolean fallecido) { this.fallecido = fallecido; }
    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }

    @Transient
    public String getEdadCalculada() {
        if (fechaNacimiento != null) {
            Period p = Period.between(fechaNacimiento, LocalDate.now());
            if (p.getYears() > 0) {
                return p.getYears() + " año" + (p.getYears() > 1 ? "s" : "") + (p.getMonths() > 0 ? " " + p.getMonths() + "m" : "");
            } else if (p.getMonths() > 0) {
                return p.getMonths() + " mes" + (p.getMonths() > 1 ? "es" : "");
            } else {
                return p.getDays() + " día" + (p.getDays() > 1 ? "s" : "");
            }
        }
        return edadEstimada != null ? edadEstimada : "";
    }
}
