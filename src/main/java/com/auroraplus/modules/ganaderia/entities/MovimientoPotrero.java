package com.auroraplus.modules.ganaderia.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.time.LocalDateTime;

/** Kárdex de ubicación: cada traslado de un animal entre potreros queda registrado (trazabilidad de pastoreo rotacional). */
@Entity
@Table(name = "movimientos_potrero")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class MovimientoPotrero {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "animal_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Animal animal;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "potrero_origen_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Potrero potreroOrigen;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "potrero_destino_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Potrero potreroDestino;

    private String motivo;

    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Animal getAnimal() { return animal; }
    public void setAnimal(Animal animal) { this.animal = animal; }
    public Potrero getPotreroOrigen() { return potreroOrigen; }
    public void setPotreroOrigen(Potrero potreroOrigen) { this.potreroOrigen = potreroOrigen; }
    public Potrero getPotreroDestino() { return potreroDestino; }
    public void setPotreroDestino(Potrero potreroDestino) { this.potreroDestino = potreroDestino; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
    public LocalDateTime getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(LocalDateTime fechaRegistro) { this.fechaRegistro = fechaRegistro; }
}
