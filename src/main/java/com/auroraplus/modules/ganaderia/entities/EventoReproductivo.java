package com.auroraplus.modules.ganaderia.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.time.LocalDate;

/** Control reproductivo: servicio/monta, diagnóstico de preñez, y parto — el corazón del negocio de cría. */
@Entity
@Table(name = "eventos_reproductivos")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class EventoReproductivo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "hembra_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Animal hembra;

    @Column(nullable = false, length = 25)
    private String tipo; // SERVICIO, DIAGNOSTICO_PRENEZ, PARTO

    @Column(nullable = false)
    private LocalDate fecha;

    // Identificación del semental — puede ser un Animal propio o texto libre (semen de IA de un tercero).
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "semental_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Animal semental;

    @Column(name = "semental_referencia_externa")
    private String sementalReferenciaExterna;

    private String resultado; // POSITIVO/NEGATIVO (diagnóstico), NORMAL/DIFICIL/CESAREA (parto)...

    @Column(name = "fecha_probable_parto")
    private LocalDate fechaProbableParto;

    // Si el evento es PARTO, referencia a la cría recién registrada como Animal nuevo.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "cria_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Animal cria;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Animal getHembra() { return hembra; }
    public void setHembra(Animal hembra) { this.hembra = hembra; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public Animal getSemental() { return semental; }
    public void setSemental(Animal semental) { this.semental = semental; }
    public String getSementalReferenciaExterna() { return sementalReferenciaExterna; }
    public void setSementalReferenciaExterna(String sementalReferenciaExterna) { this.sementalReferenciaExterna = sementalReferenciaExterna; }
    public String getResultado() { return resultado; }
    public void setResultado(String resultado) { this.resultado = resultado; }
    public LocalDate getFechaProbableParto() { return fechaProbableParto; }
    public void setFechaProbableParto(LocalDate fechaProbableParto) { this.fechaProbableParto = fechaProbableParto; }
    public Animal getCria() { return cria; }
    public void setCria(Animal cria) { this.cria = cria; }
}
