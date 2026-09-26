package com.auroraplus.modules.pacientesapp.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Une la cuenta de la app con el paciente de un consultorio (salud_pacientes). */
@Entity
@Table(name = "app_pacientes_vinculos",
    uniqueConstraints = @UniqueConstraint(name = "uq_app_vinculo", columnNames = {"paciente_app_id", "tenant_id"}))
public class VinculoPacienteApp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "paciente_app_id", nullable = false)
    private Long pacienteAppId;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "paciente_id", nullable = false)
    private Long pacienteId;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    public Long getId() { return id; }
    public Long getPacienteAppId() { return pacienteAppId; }
    public void setPacienteAppId(Long pacienteAppId) { this.pacienteAppId = pacienteAppId; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Long getPacienteId() { return pacienteId; }
    public void setPacienteId(Long pacienteId) { this.pacienteId = pacienteId; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
}
