package com.auroraplus.modules.construccion.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "documentos_bim_construccion")
public class DocumentoBimEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "proyecto_id", nullable = false)
    private Long proyectoId;

    @Column(name = "codigo", nullable = false, length = 50)
    private String codigo;

    @Column(name = "titulo", nullable = false, length = 200)
    private String titulo;

    @Column(name = "disciplina", nullable = false, length = 50)
    private String disciplina; // ARQUITECTURA, ESTRUCTURAS, INSTALACIONES_SANITARIAS, INSTALACIONES_ELECTRICAS, MECANICA_CLIMATIZACION, COORDINACION_GENERAL

    @Column(name = "formato", nullable = false, length = 30)
    private String formato; // IFC, RVT_REVIT, DWG_AUTOCAD, PDF_PLANO, NWD_NAVISWORKS

    @Column(name = "version", nullable = false, length = 20)
    private String version = "v1.0";

    @Column(name = "autor_proyectista", length = 150)
    private String autorProyectista;

    @Column(name = "archivo_url", columnDefinition = "TEXT")
    private String archivoUrl;

    @Column(name = "peso_mb", precision = 10, scale = 2)
    private BigDecimal pesoMb;

    @Column(name = "estado_revision", nullable = false, length = 50)
    private String estadoRevision = "VIGENTE"; // VIGENTE, EN_REVISION, SUPERIOR_OBSOLETO, APROBADO_PARA_CONSTRUCCION

    @Column(name = "observaciones", columnDefinition = "TEXT")
    private String observaciones;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }

    public Long getProyectoId() { return proyectoId; }
    public void setProyectoId(Long proyectoId) { this.proyectoId = proyectoId; }

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }

    public String getDisciplina() { return disciplina; }
    public void setDisciplina(String disciplina) { this.disciplina = disciplina; }

    public String getFormato() { return formato; }
    public void setFormato(String formato) { this.formato = formato; }

    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }

    public String getAutorProyectista() { return autorProyectista; }
    public void setAutorProyectista(String autorProyectista) { this.autorProyectista = autorProyectista; }

    public String getArchivoUrl() { return archivoUrl; }
    public void setArchivoUrl(String archivoUrl) { this.archivoUrl = archivoUrl; }

    public BigDecimal getPesoMb() { return pesoMb; }
    public void setPesoMb(BigDecimal pesoMb) { this.pesoMb = pesoMb; }

    public String getEstadoRevision() { return estadoRevision; }
    public void setEstadoRevision(String estadoRevision) { this.estadoRevision = estadoRevision; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
