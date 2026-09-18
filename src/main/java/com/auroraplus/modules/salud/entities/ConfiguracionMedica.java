package com.auroraplus.modules.salud.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/**
 * Guarda SOLO el candado del PIN/clave del Médico Titular (verificación real del
 * lado servidor). El resto del perfil (nombre, especialidad, tasas de cambio, etc.)
 * sigue viviendo en localStorage del navegador porque no es información de seguridad
 * — este PIN antes también vivía ahí en texto plano y se comparaba en el cliente,
 * lo que permitía saltárselo por completo con las herramientas de desarrollador.
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

    @Column(name = "clave_doctor_hash", nullable = false)
    private String claveDoctorHash;

    @Column(name = "clave_doctor_personalizada", nullable = false)
    private Boolean claveDoctorPersonalizada = false;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getClaveDoctorHash() { return claveDoctorHash; }
    public void setClaveDoctorHash(String claveDoctorHash) { this.claveDoctorHash = claveDoctorHash; }
    public Boolean getClaveDoctorPersonalizada() { return claveDoctorPersonalizada; }
    public void setClaveDoctorPersonalizada(Boolean claveDoctorPersonalizada) { this.claveDoctorPersonalizada = claveDoctorPersonalizada; }
}
