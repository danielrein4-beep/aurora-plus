package com.auroraplus.modules.salud.laboratorio.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;

@Entity
@Table(name = "salud_ordenes_laboratorio", indexes = {
    @Index(name = "idx_sol_tenant", columnList = "tenant_id"),
    @Index(name = "idx_sol_token", columnList = "token_seguro", unique = true),
    @Index(name = "idx_sol_paciente", columnList = "paciente_id")
})
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class OrdenLaboratorio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "codigo_orden", nullable = false, length = 40)
    private String codigoOrden; // ej: LAB-2026-0001

    @Column(name = "token_seguro", nullable = false, unique = true, length = 64)
    private String tokenSeguro; // UUID público único

    @Column(name = "paciente_id", nullable = false)
    private Long pacienteId;

    @Column(name = "paciente_nombre", nullable = false, length = 150)
    private String pacienteNombre;

    @Column(name = "paciente_cedula", length = 30)
    private String pacienteCedula;

    @Column(name = "paciente_telefono", length = 30)
    private String pacienteTelefono;

    @Column(name = "medico_id")
    private Long medicoId;

    @Column(name = "medico_nombre", length = 150)
    private String medicoNombre;

    @Column(name = "consulta_id")
    private Long consultaId;

    @Column(name = "fecha_emision", nullable = false)
    private LocalDateTime fechaEmision = LocalDateTime.now();

    @Column(name = "estado", nullable = false, length = 30)
    private String estado = "EMITIDA"; // EMITIDA, SELLADA, CANCELADA

    @Column(name = "examenes_solicitados", columnDefinition = "TEXT", nullable = false)
    private String examenesSolicitados;

    @Column(name = "indicaciones_clinicas", columnDefinition = "TEXT")
    private String indicacionesClinicas;

    @Column(name = "diagnostico_presuntivo", length = 250)
    private String diagnosticoPresuntivo;

    @Column(name = "laboratorio_sugerido", length = 150)
    private String laboratorioSugerido;

    @Column(name = "revisado_por_medico", nullable = false)
    private boolean revisadoPorMedico = false;

    @Column(name = "fecha_revision_medico")
    private LocalDateTime fechaRevisionMedico;

    @Column(name = "notas_revision_medico", columnDefinition = "TEXT")
    private String notasRevisionMedico;

    @OneToOne(mappedBy = "orden", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private ResultadoLaboratorio resultado;

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }

    public String getCodigoOrden() { return codigoOrden; }
    public void setCodigoOrden(String codigoOrden) { this.codigoOrden = codigoOrden; }

    public String getTokenSeguro() { return tokenSeguro; }
    public void setTokenSeguro(String tokenSeguro) { this.tokenSeguro = tokenSeguro; }

    public Long getPacienteId() { return pacienteId; }
    public void setPacienteId(Long pacienteId) { this.pacienteId = pacienteId; }

    public String getPacienteNombre() { return pacienteNombre; }
    public void setPacienteNombre(String pacienteNombre) { this.pacienteNombre = pacienteNombre; }

    public String getPacienteCedula() { return pacienteCedula; }
    public void setPacienteCedula(String pacienteCedula) { this.pacienteCedula = pacienteCedula; }

    public String getPacienteTelefono() { return pacienteTelefono; }
    public void setPacienteTelefono(String pacienteTelefono) { this.pacienteTelefono = pacienteTelefono; }

    public Long getMedicoId() { return medicoId; }
    public void setMedicoId(Long medicoId) { this.medicoId = medicoId; }

    public String getMedicoNombre() { return medicoNombre; }
    public void setMedicoNombre(String medicoNombre) { this.medicoNombre = medicoNombre; }

    public Long getConsultaId() { return consultaId; }
    public void setConsultaId(Long consultaId) { this.consultaId = consultaId; }

    public LocalDateTime getFechaEmision() { return fechaEmision; }
    public void setFechaEmision(LocalDateTime fechaEmision) { this.fechaEmision = fechaEmision; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getExamenesSolicitados() { return examenesSolicitados; }
    public void setExamenesSolicitados(String examenesSolicitados) { this.examenesSolicitados = examenesSolicitados; }

    public String getIndicacionesClinicas() { return indicacionesClinicas; }
    public void setIndicacionesClinicas(String indicacionesClinicas) { this.indicacionesClinicas = indicacionesClinicas; }

    public String getDiagnosticoPresuntivo() { return diagnosticoPresuntivo; }
    public void setDiagnosticoPresuntivo(String diagnosticoPresuntivo) { this.diagnosticoPresuntivo = diagnosticoPresuntivo; }

    public String getLaboratorioSugerido() { return laboratorioSugerido; }
    public void setLaboratorioSugerido(String laboratorioSugerido) { this.laboratorioSugerido = laboratorioSugerido; }

    public boolean isRevisadoPorMedico() { return revisadoPorMedico; }
    public void setRevisadoPorMedico(boolean revisadoPorMedico) { this.revisadoPorMedico = revisadoPorMedico; }

    public LocalDateTime getFechaRevisionMedico() { return fechaRevisionMedico; }
    public void setFechaRevisionMedico(LocalDateTime fechaRevisionMedico) { this.fechaRevisionMedico = fechaRevisionMedico; }

    public String getNotasRevisionMedico() { return notasRevisionMedico; }
    public void setNotasRevisionMedico(String notasRevisionMedico) { this.notasRevisionMedico = notasRevisionMedico; }

    public ResultadoLaboratorio getResultado() { return resultado; }
    public void setResultado(ResultadoLaboratorio resultado) {
        this.resultado = resultado;
        if (resultado != null) {
            resultado.setOrden(this);
        }
    }
}
