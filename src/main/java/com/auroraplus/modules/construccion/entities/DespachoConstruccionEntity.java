package com.auroraplus.modules.construccion.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "despachos_construccion")
public class DespachoConstruccionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "proyecto_id", nullable = false)
    private Long proyectoId;

    @Column(name = "insumo_id")
    private Long insumoId;

    @Column(name = "guia_numero", nullable = false, length = 100)
    private String guiaNumero;

    @Column(name = "tipo_material", nullable = false, length = 50)
    private String tipoMaterial; // CONCRETO_PREMEZCLADO, ACERO_CABILLAS, AGREGADOS_CANTERA, CEMENTO_GRANEL, OTROS

    @Column(name = "origen", nullable = false)
    private String origen;

    @Column(name = "destino_frente", nullable = false)
    private String destinoFrente;

    @Column(name = "unidad_transporte", length = 150)
    private String unidadTransporte;

    @Column(name = "chofer", length = 150)
    private String chofer;

    @Column(name = "estado", nullable = false, length = 50)
    private String estado = "EN_TRANSITO"; // EN_TRANSITO, EN_BASCULA, DESCARGANDO, RECIBIDO, RECHAZADO

    @Column(name = "cantidad", precision = 14, scale = 4, nullable = false)
    private BigDecimal cantidad = BigDecimal.ZERO;

    @Column(name = "unidad_medida", nullable = false, length = 20)
    private String unidadMedida = "m3";

    @Column(name = "peso_bruto_kg", precision = 14, scale = 2)
    private BigDecimal pesoBrutoKg;

    @Column(name = "peso_tara_kg", precision = 14, scale = 2)
    private BigDecimal pesoTaraKg;

    @Column(name = "peso_neto_kg", precision = 14, scale = 2)
    private BigDecimal pesoNetoKg;

    @Column(name = "slump_cono_pulgadas", precision = 6, scale = 2)
    private BigDecimal slumpConoPulgadas;

    @Column(name = "fecha_hora_salida")
    private LocalDateTime fechaHoraSalida;

    @Column(name = "fecha_hora_llegada")
    private LocalDateTime fechaHoraLlegada;

    @Column(name = "moneda", length = 10)
    private String moneda = "USD";

    @Column(name = "tasa_cambio_congelada", precision = 18, scale = 6)
    private BigDecimal tasaCambioCongelada;

    @Column(name = "costo_flete_monto", precision = 18, scale = 4)
    private BigDecimal costoFleteMonto;

    @Column(name = "costo_flete_moneda", length = 10)
    private String costoFleteMoneda;

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

    public Long getInsumoId() { return insumoId; }
    public void setInsumoId(Long insumoId) { this.insumoId = insumoId; }

    public String getGuiaNumero() { return guiaNumero; }
    public void setGuiaNumero(String guiaNumero) { this.guiaNumero = guiaNumero; }

    public String getTipoMaterial() { return tipoMaterial; }
    public void setTipoMaterial(String tipoMaterial) { this.tipoMaterial = tipoMaterial; }

    public String getOrigen() { return origen; }
    public void setOrigen(String origen) { this.origen = origen; }

    public String getDestinoFrente() { return destinoFrente; }
    public void setDestinoFrente(String destinoFrente) { this.destinoFrente = destinoFrente; }

    public String getUnidadTransporte() { return unidadTransporte; }
    public void setUnidadTransporte(String unidadTransporte) { this.unidadTransporte = unidadTransporte; }

    public String getChofer() { return chofer; }
    public void setChofer(String chofer) { this.chofer = chofer; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public BigDecimal getCantidad() { return cantidad; }
    public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }

    public String getUnidadMedida() { return unidadMedida; }
    public void setUnidadMedida(String unidadMedida) { this.unidadMedida = unidadMedida; }

    public BigDecimal getPesoBrutoKg() { return pesoBrutoKg; }
    public void setPesoBrutoKg(BigDecimal pesoBrutoKg) { this.pesoBrutoKg = pesoBrutoKg; }

    public BigDecimal getPesoTaraKg() { return pesoTaraKg; }
    public void setPesoTaraKg(BigDecimal pesoTaraKg) { this.pesoTaraKg = pesoTaraKg; }

    public BigDecimal getPesoNetoKg() { return pesoNetoKg; }
    public void setPesoNetoKg(BigDecimal pesoNetoKg) { this.pesoNetoKg = pesoNetoKg; }

    public BigDecimal getSlumpConoPulgadas() { return slumpConoPulgadas; }
    public void setSlumpConoPulgadas(BigDecimal slumpConoPulgadas) { this.slumpConoPulgadas = slumpConoPulgadas; }

    public LocalDateTime getFechaHoraSalida() { return fechaHoraSalida; }
    public void setFechaHoraSalida(LocalDateTime fechaHoraSalida) { this.fechaHoraSalida = fechaHoraSalida; }

    public LocalDateTime getFechaHoraLlegada() { return fechaHoraLlegada; }
    public void setFechaHoraLlegada(LocalDateTime fechaHoraLlegada) { this.fechaHoraLlegada = fechaHoraLlegada; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }

    public BigDecimal getTasaCambioCongelada() { return tasaCambioCongelada; }
    public void setTasaCambioCongelada(BigDecimal tasaCambioCongelada) { this.tasaCambioCongelada = tasaCambioCongelada; }

    public BigDecimal getCostoFleteMonto() { return costoFleteMonto; }
    public void setCostoFleteMonto(BigDecimal costoFleteMonto) { this.costoFleteMonto = costoFleteMonto; }

    public String getCostoFleteMoneda() { return costoFleteMoneda; }
    public void setCostoFleteMoneda(String costoFleteMoneda) { this.costoFleteMoneda = costoFleteMoneda; }
}
