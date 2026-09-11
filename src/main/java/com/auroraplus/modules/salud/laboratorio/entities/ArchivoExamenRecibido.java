package com.auroraplus.modules.salud.laboratorio.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

@Entity
@Table(name = "salud_archivos_examen_recibido", indexes = {
    @Index(name = "idx_salud_archex_tenant", columnList = "tenant_id"),
    @Index(name = "idx_salud_archex_examen", columnList = "examen_id")
})
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class ArchivoExamenRecibido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne
    @JoinColumn(name = "examen_id", nullable = false)
    @JsonIgnore
    private ExamenRecibidoPaciente examen;

    @Column(name = "nombre_archivo", nullable = false, length = 200)
    private String nombreArchivo;

    @Column(name = "tipo_mime", nullable = false, length = 100)
    private String tipoMime;

    @Column(name = "contenido_base64", columnDefinition = "TEXT", nullable = false)
    private String contenidoBase64;

    @Column(nullable = false)
    private int orden;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public ExamenRecibidoPaciente getExamen() { return examen; }
    public void setExamen(ExamenRecibidoPaciente examen) { this.examen = examen; }
    public String getNombreArchivo() { return nombreArchivo; }
    public void setNombreArchivo(String nombreArchivo) { this.nombreArchivo = nombreArchivo; }
    public String getTipoMime() { return tipoMime; }
    public void setTipoMime(String tipoMime) { this.tipoMime = tipoMime; }
    public String getContenidoBase64() { return contenidoBase64; }
    public void setContenidoBase64(String contenidoBase64) { this.contenidoBase64 = contenidoBase64; }
    public int getOrden() { return orden; }
    public void setOrden(int orden) { this.orden = orden; }
}
