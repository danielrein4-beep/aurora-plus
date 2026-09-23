package com.auroraplus.modules.ganaderia.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Acuerdo de ceba en sociedad: el socio aporta animales que se engordan en la finca
 * y los kilos ganados se reparten según porcentajeFinca / (100 - porcentajeFinca).
 * El socio conserva siempre el peso con el que entró cada animal.
 */
@Entity
@Table(name = "sociedades_ceba", indexes = @Index(name = "idx_sociedades_ceba_tenant", columnList = "tenant_id"))
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class SociedadCeba {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "nombre_socio", nullable = false, length = 150)
    private String nombreSocio;

    @Column(name = "documento_socio", length = 40)
    private String documentoSocio;

    @Column(name = "telefono_socio", length = 40)
    private String telefonoSocio;

    /** Porcentaje de los kilos ganados que corresponde a la finca (0-100). */
    @Column(name = "porcentaje_finca", nullable = false, precision = 5, scale = 2)
    private BigDecimal porcentajeFinca;

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    @Column(nullable = false, length = 20)
    private String estado = "ACTIVA"; // ACTIVA, CERRADA

    @Column(name = "fecha_cierre")
    private LocalDate fechaCierre;

    @Column(length = 500)
    private String notas;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombreSocio() { return nombreSocio; }
    public void setNombreSocio(String nombreSocio) { this.nombreSocio = nombreSocio; }
    public String getDocumentoSocio() { return documentoSocio; }
    public void setDocumentoSocio(String documentoSocio) { this.documentoSocio = documentoSocio; }
    public String getTelefonoSocio() { return telefonoSocio; }
    public void setTelefonoSocio(String telefonoSocio) { this.telefonoSocio = telefonoSocio; }
    public BigDecimal getPorcentajeFinca() { return porcentajeFinca; }
    public void setPorcentajeFinca(BigDecimal porcentajeFinca) { this.porcentajeFinca = porcentajeFinca; }
    public LocalDate getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(LocalDate fechaInicio) { this.fechaInicio = fechaInicio; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public LocalDate getFechaCierre() { return fechaCierre; }
    public void setFechaCierre(LocalDate fechaCierre) { this.fechaCierre = fechaCierre; }
    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
}
