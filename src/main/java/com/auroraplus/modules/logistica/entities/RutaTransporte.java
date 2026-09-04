package com.auroraplus.modules.logistica.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "rutas_transporte")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class RutaTransporte {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String origen;

    @Column(nullable = false)
    private String destino;

    @Column(name = "placa_vehiculo", nullable = false)
    private String placaVehiculo;

    @Column(name = "costo_flete", nullable = false, precision = 18, scale = 2)
    private BigDecimal costoFlete;

    @Column(name = "fecha_despacho", nullable = false)
    private LocalDateTime fechaDespacho = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getOrigen() { return origen; }
    public void setOrigen(String origen) { this.origen = origen; }
    public String getDestino() { return destino; }
    public void setDestino(String destino) { this.destino = destino; }
    public String getPlacaVehiculo() { return placaVehiculo; }
    public void setPlacaVehiculo(String placaVehiculo) { this.placaVehiculo = placaVehiculo; }
    public BigDecimal getCostoFlete() { return costoFlete; }
    public void setCostoFlete(BigDecimal costoFlete) { this.costoFlete = costoFlete; }
    public LocalDateTime getFechaDespacho() { return fechaDespacho; }
    public void setFechaDespacho(LocalDateTime fechaDespacho) { this.fechaDespacho = fechaDespacho; }
}
