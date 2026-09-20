package com.auroraplus.modules.construccion.entities;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "rfis_construccion")
public class RfiConstruccionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "proyecto_id", nullable = false)
    private Long proyectoId;

    @Column(name = "documento_bim_id")
    private Long documentoBimId;

    @Column(name = "numero_rfi", nullable = false, length = 50)
    private String numeroRfi;

    @Column(name = "asunto", nullable = false, length = 200)
    private String asunto;

    @Column(name = "disciplina", nullable = false, length = 50)
    private String disciplina; // ESTRUCTURAS, ARQUITECTURA, MEP, GENERAL

    @Column(name = "pregunta_consulta", columnDefinition = "TEXT", nullable = false)
    private String preguntaConsulta;

    @Column(name = "propuesta_solucion", columnDefinition = "TEXT")
    private String propuestaSolucion;

    @Column(name = "respuesta_oficial", columnDefinition = "TEXT")
    private String respuestaOficial;

    @Column(name = "solicitante", nullable = false, length = 150)
    private String solicitante;

    @Column(name = "responsable_respuesta", length = 150)
    private String responsableRespuesta;

    @Column(name = "estado", nullable = false, length = 50)
    private String estado = "ABIERTO"; // ABIERTO, EN_EVALUACION, RESPONDIDO, CERRADO

    @Column(name = "fecha_limite")
    private LocalDate fechaLimite;

    @Column(name = "fecha_respuesta")
    private LocalDate fechaRespuesta;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }

    public Long getProyectoId() { return proyectoId; }
    public void setProyectoId(Long proyectoId) { this.proyectoId = proyectoId; }

    public Long getDocumentoBimId() { return documentoBimId; }
    public void setDocumentoBimId(Long documentoBimId) { this.documentoBimId = documentoBimId; }

    public String getNumeroRfi() { return numeroRfi; }
    public void setNumeroRfi(String numeroRfi) { this.numeroRfi = numeroRfi; }

    public String getAsunto() { return asunto; }
    public void setAsunto(String asunto) { this.asunto = asunto; }

    public String getDisciplina() { return disciplina; }
    public void setDisciplina(String disciplina) { this.disciplina = disciplina; }

    public String getPreguntaConsulta() { return preguntaConsulta; }
    public void setPreguntaConsulta(String preguntaConsulta) { this.preguntaConsulta = preguntaConsulta; }

    public String getPropuestaSolucion() { return propuestaSolucion; }
    public void setPropuestaSolucion(String propuestaSolucion) { this.propuestaSolucion = propuestaSolucion; }

    public String getRespuestaOficial() { return respuestaOficial; }
    public void setRespuestaOficial(String respuestaOficial) { this.respuestaOficial = respuestaOficial; }

    public String getSolicitante() { return solicitante; }
    public void setSolicitante(String solicitante) { this.solicitante = solicitante; }

    public String getResponsableRespuesta() { return responsableRespuesta; }
    public void setResponsableRespuesta(String responsableRespuesta) { this.responsableRespuesta = responsableRespuesta; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public LocalDate getFechaLimite() { return fechaLimite; }
    public void setFechaLimite(LocalDate fechaLimite) { this.fechaLimite = fechaLimite; }

    public LocalDate getFechaRespuesta() { return fechaRespuesta; }
    public void setFechaRespuesta(LocalDate fechaRespuesta) { this.fechaRespuesta = fechaRespuesta; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
