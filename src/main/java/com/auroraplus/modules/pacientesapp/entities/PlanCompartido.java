package com.auroraplus.modules.pacientesapp.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Copia de la parte de una consulta que el médico decidió mostrarle al paciente en la app.
 * Nunca lleva las anotaciones privadas; si el médico edita la consulta después, el paciente
 * sigue viendo esta copia hasta que el médico vuelva a compartir.
 */
@Entity
@Table(name = "app_pacientes_planes_compartidos",
    uniqueConstraints = @UniqueConstraint(name = "uq_app_plan_consulta", columnNames = {"tenant_id", "consulta_id"}),
    indexes = @Index(name = "idx_app_planes_paciente", columnList = "tenant_id, paciente_id"))
public class PlanCompartido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "consulta_id", nullable = false)
    private Long consultaId;

    @Column(name = "paciente_id", nullable = false)
    private Long pacienteId;

    @Column(name = "fecha_consulta", nullable = false)
    private LocalDateTime fechaConsulta;

    @Column(columnDefinition = "TEXT")
    private String diagnostico;

    @Column(name = "plan_tratamiento", columnDefinition = "TEXT")
    private String planTratamiento;

    @Column(columnDefinition = "TEXT")
    private String indicaciones;

    @Column(columnDefinition = "TEXT")
    private String recipe;

    @Column(name = "examenes_indicados", columnDefinition = "TEXT")
    private String examenesIndicados;

    @Column(name = "compartido_por", length = 100)
    private String compartidoPor;

    @Column(name = "compartido_en", nullable = false)
    private LocalDateTime compartidoEn = LocalDateTime.now();

    public Long getId() { return id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Long getConsultaId() { return consultaId; }
    public void setConsultaId(Long consultaId) { this.consultaId = consultaId; }
    public Long getPacienteId() { return pacienteId; }
    public void setPacienteId(Long pacienteId) { this.pacienteId = pacienteId; }
    public LocalDateTime getFechaConsulta() { return fechaConsulta; }
    public void setFechaConsulta(LocalDateTime fechaConsulta) { this.fechaConsulta = fechaConsulta; }
    public String getDiagnostico() { return diagnostico; }
    public void setDiagnostico(String diagnostico) { this.diagnostico = diagnostico; }
    public String getPlanTratamiento() { return planTratamiento; }
    public void setPlanTratamiento(String planTratamiento) { this.planTratamiento = planTratamiento; }
    public String getIndicaciones() { return indicaciones; }
    public void setIndicaciones(String indicaciones) { this.indicaciones = indicaciones; }
    public String getRecipe() { return recipe; }
    public void setRecipe(String recipe) { this.recipe = recipe; }
    public String getExamenesIndicados() { return examenesIndicados; }
    public void setExamenesIndicados(String examenesIndicados) { this.examenesIndicados = examenesIndicados; }
    public String getCompartidoPor() { return compartidoPor; }
    public void setCompartidoPor(String compartidoPor) { this.compartidoPor = compartidoPor; }
    public LocalDateTime getCompartidoEn() { return compartidoEn; }
    public void setCompartidoEn(LocalDateTime compartidoEn) { this.compartidoEn = compartidoEn; }
}
