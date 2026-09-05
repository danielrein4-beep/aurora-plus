package com.auroraplus.modules.salud.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

/**
 * Consulta y evolución médica — Ficha clínica confidencial con signos vitales,
 * exploración, diagnósticos CIE-10, plan terapéutico y recetas.
 */
@Entity
@Table(name = "salud_consultas", indexes = {
    @Index(name = "idx_salud_cons_tenant_paciente", columnList = "tenant_id, paciente_id"),
    @Index(name = "idx_salud_cons_tenant_medico", columnList = "tenant_id, medico_id")
})
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class ConsultaMedica {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "paciente_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Paciente paciente;

    @Column(name = "cita_id")
    private Long citaId;

    @Column(name = "medico_id", nullable = false)
    private Long medicoId;

    @Column(name = "medico_nombre", length = 150)
    private String medicoNombre;

    @Column(name = "fecha_hora", nullable = false)
    private LocalDateTime fechaHora = LocalDateTime.now();

    @Column(name = "motivo_consulta", columnDefinition = "TEXT", nullable = false)
    private String motivoConsulta;

    @Column(name = "enfermedad_actual", columnDefinition = "TEXT")
    private String enfermedadActual;

    @Column(name = "examen_fisico", columnDefinition = "TEXT")
    private String examenFisico;

    // --- Signos Vitales ---
    @Column(name = "presion_arterial", length = 20)
    private String presionArterial; // ej. 120/80

    @Column(name = "frecuencia_cardiaca")
    private Integer frecuenciaCardiaca; // bpm

    @Column(name = "frecuencia_respiratoria")
    private Integer frecuenciaRespiratoria; // rpm

    @Column(precision = 4, scale = 1)
    private BigDecimal temperatura; // °C

    @Column(name = "saturacion_oxigeno")
    private Integer saturacionOxigeno; // %

    @Column(name = "peso_kg", precision = 6, scale = 2)
    private BigDecimal pesoKg;

    @Column(name = "talla_m", precision = 4, scale = 2)
    private BigDecimal tallaM;

    @Column(precision = 5, scale = 2)
    private BigDecimal imc;

    // --- Diagnósticos y Tratamiento ---
    @Column(name = "diagnostico_principal_cie10", length = 20)
    private String diagnosticoPrincipalCIE10;

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

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Paciente getPaciente() { return paciente; }
    public void setPaciente(Paciente paciente) { this.paciente = paciente; }
    public Long getCitaId() { return citaId; }
    public void setCitaId(Long citaId) { this.citaId = citaId; }
    public Long getMedicoId() { return medicoId; }
    public void setMedicoId(Long medicoId) { this.medicoId = medicoId; }
    public String getMedicoNombre() { return medicoNombre; }
    public void setMedicoNombre(String medicoNombre) { this.medicoNombre = medicoNombre; }
    public LocalDateTime getFechaHora() { return fechaHora; }
    public void setFechaHora(LocalDateTime fechaHora) { this.fechaHora = fechaHora; }
    public String getMotivoConsulta() { return motivoConsulta; }
    public void setMotivoConsulta(String motivoConsulta) { this.motivoConsulta = motivoConsulta; }
    public String getEnfermedadActual() { return enfermedadActual; }
    public void setEnfermedadActual(String enfermedadActual) { this.enfermedadActual = enfermedadActual; }
    public String getExamenFisico() { return examenFisico; }
    public void setExamenFisico(String examenFisico) { this.examenFisico = examenFisico; }
    public String getPresionArterial() { return presionArterial; }
    public void setPresionArterial(String presionArterial) { this.presionArterial = presionArterial; }
    public Integer getFrecuenciaCardiaca() { return frecuenciaCardiaca; }
    public void setFrecuenciaCardiaca(Integer frecuenciaCardiaca) { this.frecuenciaCardiaca = frecuenciaCardiaca; }
    public Integer getFrecuenciaRespiratoria() { return frecuenciaRespiratoria; }
    public void setFrecuenciaRespiratoria(Integer frecuenciaRespiratoria) { this.frecuenciaRespiratoria = frecuenciaRespiratoria; }
    public BigDecimal getTemperatura() { return temperatura; }
    public void setTemperatura(BigDecimal temperatura) { this.temperatura = temperatura; }
    public Integer getSaturacionOxigeno() { return saturacionOxigeno; }
    public void setSaturacionOxigeno(Integer saturacionOxigeno) { this.saturacionOxigeno = saturacionOxigeno; }
    public BigDecimal getPesoKg() { return pesoKg; }
    public void setPesoKg(BigDecimal pesoKg) { this.pesoKg = pesoKg; }
    public BigDecimal getTallaM() { return tallaM; }
    public void setTallaM(BigDecimal tallaM) { this.tallaM = tallaM; }
    public BigDecimal getImc() { return imc; }
    public void setImc(BigDecimal imc) { this.imc = imc; }
    public String getDiagnosticoPrincipalCIE10() { return diagnosticoPrincipalCIE10; }
    public void setDiagnosticoPrincipalCIE10(String diagnosticoPrincipalCIE10) { this.diagnosticoPrincipalCIE10 = diagnosticoPrincipalCIE10; }
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

    @PrePersist
    @PreUpdate
    public void calcularImc() {
        if (pesoKg != null && tallaM != null && tallaM.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal tallaAlCuadrado = tallaM.multiply(tallaM);
            this.imc = pesoKg.divide(tallaAlCuadrado, 2, RoundingMode.HALF_UP);
        }
    }
}
