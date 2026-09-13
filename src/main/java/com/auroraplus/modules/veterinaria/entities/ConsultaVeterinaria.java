package com.auroraplus.modules.veterinaria.entities;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Consulta y evolución clínica veterinaria.
 * Adapta ConsultaMedica incorporando condición corporal (BCS 1-9) y diagnóstico libre,
 * prescindiendo de parámetros de medicina humana.
 */
@Entity
@Table(name = "consultas_veterinarias", indexes = {
    @Index(name = "idx_vet_consultas_tenant_mascota", columnList = "tenant_id, mascota_id"),
    @Index(name = "idx_vet_consultas_tenant", columnList = "tenant_id")
})
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class ConsultaVeterinaria {

    public enum EstadoEvolucion { MEJORO, IGUAL, EMPEORO }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "mascota_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Mascota mascota;

    @Column(name = "cita_id")
    private Long citaId;

    @Column(name = "veterinario_id")
    private Long veterinarioId;

    @Column(name = "veterinario_nombre", length = 150)
    private String veterinarioNombre;

    @Column(name = "fecha_hora", nullable = false)
    private LocalDateTime fechaHora = LocalDateTime.now();

    @Column(name = "motivo_consulta", nullable = false, length = 255)
    private String motivoConsulta;

    @Column(name = "enfermedad_actual", columnDefinition = "TEXT")
    private String enfermedadActual;

    @Column(name = "examen_fisico", columnDefinition = "TEXT")
    @JsonProperty("observacionFisica")
    private String examenFisico;

    @Column(name = "evolucion_clinica", columnDefinition = "TEXT")
    private String evolucionClinica;

    @Enumerated(EnumType.STRING)
    @Column(name = "evolucion_estado", length = 20)
    private EstadoEvolucion evolucionEstado;

    // --- Constantes Fisiológicas y Parámetros Veterinarios ---
    @Column(name = "frecuencia_cardiaca")
    private Integer frecuenciaCardiaca; // lpm

    @Column(name = "frecuencia_respiratoria")
    private Integer frecuenciaRespiratoria; // rpm

    @Column(precision = 4, scale = 1)
    private BigDecimal temperatura; // °C

    @Column(name = "peso_kg", precision = 6, scale = 2)
    @JsonProperty("peso")
    @JsonAlias("pesoKg")
    private BigDecimal pesoKg;

    /** Condición corporal en escala estándar 1 a 9 (Body Condition Score). */
    @Column(name = "condicion_corporal")
    private Integer condicionCorporal;

    // --- Diagnósticos y Tratamiento ---
    @Column(name = "diagnostico_principal", length = 255)
    private String diagnosticoPrincipal;

    @Column(name = "descripcion_diagnostico", columnDefinition = "TEXT")
    private String descripcionDiagnostico;

    @Column(name = "diagnosticos_secundarios", columnDefinition = "TEXT")
    private String diagnosticosSecundarios;

    @Column(name = "plan_tratamiento", columnDefinition = "TEXT")
    private String planTratamiento;

    @Column(name = "recipe_medicamentos", columnDefinition = "TEXT")
    private String recipeMedicamentos;

    @Column(name = "indicaciones_generales", columnDefinition = "TEXT")
    private String indicacionesGenerales;

    @Column(name = "orden_examenes", columnDefinition = "TEXT")
    private String ordenExamenes;

    @Column(name = "anotaciones_privadas", columnDefinition = "TEXT")
    private String anotacionesPrivadas;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Mascota getMascota() { return mascota; }
    public void setMascota(Mascota mascota) { this.mascota = mascota; }
    public Long getCitaId() { return citaId; }
    public void setCitaId(Long citaId) { this.citaId = citaId; }
    public Long getVeterinarioId() { return veterinarioId; }
    public void setVeterinarioId(Long veterinarioId) { this.veterinarioId = veterinarioId; }
    public String getVeterinarioNombre() { return veterinarioNombre; }
    public void setVeterinarioNombre(String veterinarioNombre) { this.veterinarioNombre = veterinarioNombre; }
    public LocalDateTime getFechaHora() { return fechaHora; }
    public void setFechaHora(LocalDateTime fechaHora) { this.fechaHora = fechaHora; }
    public String getMotivoConsulta() { return motivoConsulta; }
    public void setMotivoConsulta(String motivoConsulta) { this.motivoConsulta = motivoConsulta; }
    public String getEnfermedadActual() { return enfermedadActual; }
    public void setEnfermedadActual(String enfermedadActual) { this.enfermedadActual = enfermedadActual; }
    public String getExamenFisico() { return examenFisico; }
    public void setExamenFisico(String examenFisico) { this.examenFisico = examenFisico; }
    public String getEvolucionClinica() { return evolucionClinica; }
    public void setEvolucionClinica(String evolucionClinica) { this.evolucionClinica = evolucionClinica; }
    public EstadoEvolucion getEvolucionEstado() { return evolucionEstado; }
    public void setEvolucionEstado(EstadoEvolucion evolucionEstado) { this.evolucionEstado = evolucionEstado; }
    public Integer getFrecuenciaCardiaca() { return frecuenciaCardiaca; }
    public void setFrecuenciaCardiaca(Integer frecuenciaCardiaca) { this.frecuenciaCardiaca = frecuenciaCardiaca; }
    public Integer getFrecuenciaRespiratoria() { return frecuenciaRespiratoria; }
    public void setFrecuenciaRespiratoria(Integer frecuenciaRespiratoria) { this.frecuenciaRespiratoria = frecuenciaRespiratoria; }
    public BigDecimal getTemperatura() { return temperatura; }
    public void setTemperatura(BigDecimal temperatura) { this.temperatura = temperatura; }
    public BigDecimal getPesoKg() { return pesoKg; }
    public void setPesoKg(BigDecimal pesoKg) { this.pesoKg = pesoKg; }
    public Integer getCondicionCorporal() { return condicionCorporal; }
    public void setCondicionCorporal(Integer condicionCorporal) { this.condicionCorporal = condicionCorporal; }
    public String getDiagnosticoPrincipal() { return diagnosticoPrincipal; }
    public void setDiagnosticoPrincipal(String diagnosticoPrincipal) { this.diagnosticoPrincipal = diagnosticoPrincipal; }
    public String getDescripcionDiagnostico() { return descripcionDiagnostico; }
    public void setDescripcionDiagnostico(String descripcionDiagnostico) { this.descripcionDiagnostico = descripcionDiagnostico; }
    public String getDiagnosticosSecundarios() { return diagnosticosSecundarios; }
    public void setDiagnosticosSecundarios(String diagnosticosSecundarios) { this.diagnosticosSecundarios = diagnosticosSecundarios; }
    public String getPlanTratamiento() { return planTratamiento; }
    public void setPlanTratamiento(String planTratamiento) { this.planTratamiento = planTratamiento; }
    public String getRecipeMedicamentos() { return recipeMedicamentos; }
    public void setRecipeMedicamentos(String recipeMedicamentos) { this.recipeMedicamentos = recipeMedicamentos; }
    public String getIndicacionesGenerales() { return indicacionesGenerales; }
    public void setIndicacionesGenerales(String indicacionesGenerales) { this.indicacionesGenerales = indicacionesGenerales; }
    public String getOrdenExamenes() { return ordenExamenes; }
    public void setOrdenExamenes(String ordenExamenes) { this.ordenExamenes = ordenExamenes; }
    public String getAnotacionesPrivadas() { return anotacionesPrivadas; }
    public void setAnotacionesPrivadas(String anotacionesPrivadas) { this.anotacionesPrivadas = anotacionesPrivadas; }
}
