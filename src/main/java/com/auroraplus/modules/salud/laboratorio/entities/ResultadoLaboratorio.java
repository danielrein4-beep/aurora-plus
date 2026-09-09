package com.auroraplus.modules.salud.laboratorio.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "salud_resultados_laboratorio")
public class ResultadoLaboratorio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "orden_id", nullable = false, unique = true)
    @JsonIgnore
    private OrdenLaboratorio orden;

    @Column(name = "nombre_laboratorio", nullable = false, length = 150)
    private String nombreLaboratorio;

    @Column(name = "bioanalista_responsable", nullable = false, length = 150)
    private String bioanalistaResponsable;

    @Column(name = "colegiatura_bioanalista", length = 50)
    private String colegiaturaBioanalista;

    @Column(name = "fecha_carga", nullable = false)
    private LocalDateTime fechaCarga = LocalDateTime.now();

    @Column(name = "informe_detallado", columnDefinition = "TEXT")
    private String informeDetallado;

    @Column(name = "conclusion_diagnostica", columnDefinition = "TEXT")
    private String conclusionDiagnostica;

    @Column(name = "observaciones_muestra", columnDefinition = "TEXT")
    private String observacionesMuestra;

    @Column(name = "valores_criticos", nullable = false)
    private boolean valoresCriticos = false;

    @Column(name = "detalle_valores_criticos", length = 500)
    private String detalleValoresCriticos;

    @Column(name = "ip_carga", length = 60)
    private String ipCarga;

    @OneToMany(mappedBy = "resultado", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<AdjuntoResultadoLab> adjuntos = new ArrayList<>();

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public OrdenLaboratorio getOrden() { return orden; }
    public void setOrden(OrdenLaboratorio orden) { this.orden = orden; }

    public String getNombreLaboratorio() { return nombreLaboratorio; }
    public void setNombreLaboratorio(String nombreLaboratorio) { this.nombreLaboratorio = nombreLaboratorio; }

    public String getBioanalistaResponsable() { return bioanalistaResponsable; }
    public void setBioanalistaResponsable(String bioanalistaResponsable) { this.bioanalistaResponsable = bioanalistaResponsable; }

    public String getColegiaturaBioanalista() { return colegiaturaBioanalista; }
    public void setColegiaturaBioanalista(String colegiaturaBioanalista) { this.colegiaturaBioanalista = colegiaturaBioanalista; }

    public LocalDateTime getFechaCarga() { return fechaCarga; }
    public void setFechaCarga(LocalDateTime fechaCarga) { this.fechaCarga = fechaCarga; }

    public String getInformeDetallado() { return informeDetallado; }
    public void setInformeDetallado(String informeDetallado) { this.informeDetallado = informeDetallado; }

    public String getConclusionDiagnostica() { return conclusionDiagnostica; }
    public void setConclusionDiagnostica(String conclusionDiagnostica) { this.conclusionDiagnostica = conclusionDiagnostica; }

    public String getObservacionesMuestra() { return observacionesMuestra; }
    public void setObservacionesMuestra(String observacionesMuestra) { this.observacionesMuestra = observacionesMuestra; }

    public boolean isValoresCriticos() { return valoresCriticos; }
    public void setValoresCriticos(boolean valoresCriticos) { this.valoresCriticos = valoresCriticos; }

    public String getDetalleValoresCriticos() { return detalleValoresCriticos; }
    public void setDetalleValoresCriticos(String detalleValoresCriticos) { this.detalleValoresCriticos = detalleValoresCriticos; }

    public String getIpCarga() { return ipCarga; }
    public void setIpCarga(String ipCarga) { this.ipCarga = ipCarga; }

    public List<AdjuntoResultadoLab> getAdjuntos() { return adjuntos; }
    public void setAdjuntos(List<AdjuntoResultadoLab> adjuntos) {
        this.adjuntos = adjuntos;
        if (adjuntos != null) {
            for (AdjuntoResultadoLab a : adjuntos) {
                a.setResultado(this);
            }
        }
    }

    public void agregarAdjunto(AdjuntoResultadoLab adjunto) {
        this.adjuntos.add(adjunto);
        adjunto.setResultado(this);
    }
}
