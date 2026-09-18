package com.auroraplus.modules.salud.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/**
 * Configuración médica por tenant, guardada en el servidor (nunca en localStorage de un
 * solo dispositivo): el candado del PIN del Médico Titular (verificación real del lado
 * servidor — este PIN antes vivía en texto plano en el navegador y se comparaba en el
 * cliente, lo que permitía saltárselo con las herramientas de desarrollador) y el perfil
 * de membrete que se inyecta automáticamente en cada PDF (historias, récipes, comprobantes):
 * nombre del doctor, especialidad, matrícula, colegio, texto de encabezado y firma
 * electrónica. `claveDoctorHash` es nullable porque el perfil de membrete puede guardarse
 * antes de que el médico configure su primer PIN.
 */
@Entity
@Table(name = "salud_configuracion_medica")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class ConfiguracionMedica {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false, unique = true)
    private Long tenantId;

    @Column(name = "clave_doctor_hash")
    private String claveDoctorHash;

    @Column(name = "clave_doctor_personalizada", nullable = false)
    private Boolean claveDoctorPersonalizada = false;

    @Column(name = "doctor_nombre")
    private String doctorNombre;

    @Column(name = "especialidad")
    private String especialidad;

    @Column(name = "matricula_mpps")
    private String matriculaMpps;

    @Column(name = "colegio_medicos")
    private String colegioMedicos;

    @Column(name = "encabezado_texto", columnDefinition = "TEXT")
    private String encabezadoTexto;

    @Column(name = "firma_base64", columnDefinition = "TEXT")
    private String firmaBase64;

    // Borrador editable del mensaje de recordatorio de cita por WhatsApp — cada médico lo
    // ajusta una sola vez (costo, método de pago, hora de llegada varían por consultorio),
    // y el sistema solo rellena {saludo}/{paciente}/{fecha}/{hora} al enviar cada recordatorio.
    @Column(name = "plantilla_recordatorio_cita", columnDefinition = "TEXT")
    private String plantillaRecordatorioCita;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getClaveDoctorHash() { return claveDoctorHash; }
    public void setClaveDoctorHash(String claveDoctorHash) { this.claveDoctorHash = claveDoctorHash; }
    public Boolean getClaveDoctorPersonalizada() { return claveDoctorPersonalizada; }
    public void setClaveDoctorPersonalizada(Boolean claveDoctorPersonalizada) { this.claveDoctorPersonalizada = claveDoctorPersonalizada; }
    public String getDoctorNombre() { return doctorNombre; }
    public void setDoctorNombre(String doctorNombre) { this.doctorNombre = doctorNombre; }
    public String getEspecialidad() { return especialidad; }
    public void setEspecialidad(String especialidad) { this.especialidad = especialidad; }
    public String getMatriculaMpps() { return matriculaMpps; }
    public void setMatriculaMpps(String matriculaMpps) { this.matriculaMpps = matriculaMpps; }
    public String getColegioMedicos() { return colegioMedicos; }
    public void setColegioMedicos(String colegioMedicos) { this.colegioMedicos = colegioMedicos; }
    public String getEncabezadoTexto() { return encabezadoTexto; }
    public void setEncabezadoTexto(String encabezadoTexto) { this.encabezadoTexto = encabezadoTexto; }
    public String getFirmaBase64() { return firmaBase64; }
    public void setFirmaBase64(String firmaBase64) { this.firmaBase64 = firmaBase64; }
    public String getPlantillaRecordatorioCita() { return plantillaRecordatorioCita; }
    public void setPlantillaRecordatorioCita(String plantillaRecordatorioCita) { this.plantillaRecordatorioCita = plantillaRecordatorioCita; }
}
