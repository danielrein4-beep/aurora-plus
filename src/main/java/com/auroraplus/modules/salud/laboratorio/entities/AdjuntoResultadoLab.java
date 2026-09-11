package com.auroraplus.modules.salud.laboratorio.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

@Entity
@Table(name = "salud_adjuntos_resultado_lab")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class AdjuntoResultadoLab {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne
    @JoinColumn(name = "resultado_id", nullable = false)
    @JsonIgnore
    private ResultadoLaboratorio resultado;

    @Column(name = "nombre_archivo", nullable = false, length = 200)
    private String nombreArchivo;

    @Column(name = "tipo_mime", nullable = false, length = 100)
    private String tipoMime; // image/jpeg, image/png, application/pdf

    @Column(name = "contenido_base64", columnDefinition = "TEXT", nullable = false)
    private String contenidoBase64;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }

    public ResultadoLaboratorio getResultado() { return resultado; }
    public void setResultado(ResultadoLaboratorio resultado) { this.resultado = resultado; }

    public String getNombreArchivo() { return nombreArchivo; }
    public void setNombreArchivo(String nombreArchivo) { this.nombreArchivo = nombreArchivo; }

    public String getTipoMime() { return tipoMime; }
    public void setTipoMime(String tipoMime) { this.tipoMime = tipoMime; }

    public String getContenidoBase64() { return contenidoBase64; }
    public void setContenidoBase64(String contenidoBase64) { this.contenidoBase64 = contenidoBase64; }
}
