package com.auroraplus.modules.ganaderia.entities;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Guía de movilización/traslado de ganado — documento legalmente exigido en
 * la mayoría de países latinoamericanos para transportar animales fuera de
 * la finca (sanidad animal, control de abigeato). Sin esto un ganadero real
 * no puede mover legalmente su hato a una feria, matadero o comprador.
 */
@Entity
@Table(name = "guias_traslado")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class GuiaTraslado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "numero_guia", nullable = false, unique = true)
    private String numeroGuia;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(name = "origen", nullable = false)
    private String origen;

    @Column(name = "destino", nullable = false)
    private String destino;

    @Column(name = "motivo", nullable = false)
    private String motivo; // VENTA, FERIA, MATADERO, CAMBIO_DE_FINCA, TRATAMIENTO_VETERINARIO...

    @Column(name = "transportista")
    private String transportista;

    @Column(name = "placa_vehiculo")
    private String placaVehiculo;

    @Column(name = "responsable")
    private String responsable;

    @OneToMany(mappedBy = "guia", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<DetalleGuiaTraslado> animales = new ArrayList<>();

    public void addAnimal(DetalleGuiaTraslado detalle) {
        animales.add(detalle);
        detalle.setGuia(this);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNumeroGuia() { return numeroGuia; }
    public void setNumeroGuia(String numeroGuia) { this.numeroGuia = numeroGuia; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public String getOrigen() { return origen; }
    public void setOrigen(String origen) { this.origen = origen; }
    public String getDestino() { return destino; }
    public void setDestino(String destino) { this.destino = destino; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
    public String getTransportista() { return transportista; }
    public void setTransportista(String transportista) { this.transportista = transportista; }
    public String getPlacaVehiculo() { return placaVehiculo; }
    public void setPlacaVehiculo(String placaVehiculo) { this.placaVehiculo = placaVehiculo; }
    public String getResponsable() { return responsable; }
    public void setResponsable(String responsable) { this.responsable = responsable; }
    public List<DetalleGuiaTraslado> getAnimales() { return animales; }
    public void setAnimales(List<DetalleGuiaTraslado> animales) { this.animales = animales; }
}
