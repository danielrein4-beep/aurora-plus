package com.auroraplus.modules.salud.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Estado vigente de un diente en el odontograma de un paciente (notación
 * FDI: 11-18/21-28 arcada superior, 31-38/41-48 arcada inferior) — un solo
 * registro por diente que se sobreescribe (upsert) con el estado actual, no
 * historial por ahora, mismo criterio de simplicidad que el resto del
 * núcleo clínico (Paciente/ConsultaMedica son de columnas tipadas, sin
 * versión histórica por campo).
 */
@Entity
@Table(name = "salud_odontograma_dientes", uniqueConstraints = {
    @UniqueConstraint(name = "uq_odontograma_paciente_diente", columnNames = {"paciente_id", "numero_fdi"})
})
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class OdontogramaDiente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    // EAGER a propósito (mismo criterio que ya aplicamos en Aurora Retail):
    // el Hibernate6Module global serializa cualquier relación LAZY no
    // inicializada como null en vez de cargarla, y este campo no se
    // serializa directo (solo se usa para validar pertenencia al tenant).
    // @JsonIgnore explícito: sin esto, Jackson serializaba la historia
    // clínica COMPLETA del paciente (alergias, antecedentes, cédula,
    // contacto de emergencia) dentro de CADA diente del odontograma — hasta
    // 32 copias del mismo expediente en una sola respuesta.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "paciente_id", nullable = false)
    @JsonIgnore
    private Paciente paciente;

    // Notación FDI de dos dígitos: cuadrante (1-4 permanentes, 5-8 temporales) + posición (1-8).
    @Column(name = "numero_fdi", nullable = false)
    private Integer numeroFdi;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EstadoDiente estado = EstadoDiente.SANO;

    @Column(columnDefinition = "TEXT")
    private String notas;

    // Caras afectadas de la pieza (O, M, D, V, L/P). Los cambios quedan en
    // salud_odontograma_historial; este registro sigue siendo el estado vigente.
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "caras_json", columnDefinition = "jsonb")
    private List<String> caras = new ArrayList<>();

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion = LocalDateTime.now();

    public enum EstadoDiente {
        SANO, CARIES, OBTURADO, AUSENTE, CORONA, ENDODONCIA, EXTRACCION_INDICADA, IMPLANTE
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Paciente getPaciente() { return paciente; }
    public void setPaciente(Paciente paciente) { this.paciente = paciente; }
    public Integer getNumeroFdi() { return numeroFdi; }
    public void setNumeroFdi(Integer numeroFdi) { this.numeroFdi = numeroFdi; }
    public EstadoDiente getEstado() { return estado; }
    public void setEstado(EstadoDiente estado) { this.estado = estado; }
    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
    public List<String> getCaras() { return caras; }
    public void setCaras(List<String> caras) { this.caras = caras != null ? caras : new ArrayList<>(); }
    public LocalDateTime getFechaActualizacion() { return fechaActualizacion; }
    public void setFechaActualizacion(LocalDateTime fechaActualizacion) { this.fechaActualizacion = fechaActualizacion; }
}
