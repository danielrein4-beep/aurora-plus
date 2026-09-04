package com.auroraplus.modules.minero.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transformaciones_mineral")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class TransformacionMineral {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "lote_origen", nullable = false)
    private String loteOrigen;

    @Column(name = "cantidad_bruta", nullable = false, precision = 18, scale = 4)
    private BigDecimal cantidadBruta;

    @Column(name = "cantidad_grano", nullable = false, precision = 18, scale = 4)
    private BigDecimal cantidadGrano;

    @Column(name = "cantidad_menudo", nullable = false, precision = 18, scale = 4)
    private BigDecimal cantidadMenudo;

    @Column(name = "cantidad_fino", nullable = false, precision = 18, scale = 4)
    private BigDecimal cantidadFino;

    @Column(name = "porcentaje_ceniza", nullable = false, precision = 5, scale = 2)
    private BigDecimal porcentajeCeniza;

    @Column(name = "merma_impurezas", nullable = false, precision = 18, scale = 4)
    private BigDecimal mermaImpurezas;

    // Disponible para venta de ESTE lote — arranca igual a lo producido y se va
    // descontando en cada venta que referencie este lote (ver VentaMineralService).
    // Así no se puede vender más grano/menudo/fino del que realmente salió de la
    // zaranda en esta transformación.
    @Column(name = "cantidad_grano_disponible", nullable = false, precision = 18, scale = 4)
    private BigDecimal cantidadGranoDisponible;

    @Column(name = "cantidad_menudo_disponible", nullable = false, precision = 18, scale = 4)
    private BigDecimal cantidadMenudoDisponible;

    @Column(name = "cantidad_fino_disponible", nullable = false, precision = 18, scale = 4)
    private BigDecimal cantidadFinoDisponible;

    @Column(name = "fecha_transformacion", nullable = false)
    private LocalDateTime fechaTransformacion = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getLoteOrigen() { return loteOrigen; }
    public void setLoteOrigen(String loteOrigen) { this.loteOrigen = loteOrigen; }
    public BigDecimal getCantidadBruta() { return cantidadBruta; }
    public void setCantidadBruta(BigDecimal cantidadBruta) { this.cantidadBruta = cantidadBruta; }
    public BigDecimal getCantidadGrano() { return cantidadGrano; }
    public void setCantidadGrano(BigDecimal cantidadGrano) { this.cantidadGrano = cantidadGrano; }
    public BigDecimal getCantidadMenudo() { return cantidadMenudo; }
    public void setCantidadMenudo(BigDecimal cantidadMenudo) { this.cantidadMenudo = cantidadMenudo; }
    public BigDecimal getCantidadFino() { return cantidadFino; }
    public void setCantidadFino(BigDecimal cantidadFino) { this.cantidadFino = cantidadFino; }
    public BigDecimal getPorcentajeCeniza() { return porcentajeCeniza; }
    public void setPorcentajeCeniza(BigDecimal porcentajeCeniza) { this.porcentajeCeniza = porcentajeCeniza; }
    public BigDecimal getMermaImpurezas() { return mermaImpurezas; }
    public void setMermaImpurezas(BigDecimal mermaImpurezas) { this.mermaImpurezas = mermaImpurezas; }
    public BigDecimal getCantidadGranoDisponible() { return cantidadGranoDisponible; }
    public void setCantidadGranoDisponible(BigDecimal cantidadGranoDisponible) { this.cantidadGranoDisponible = cantidadGranoDisponible; }
    public BigDecimal getCantidadMenudoDisponible() { return cantidadMenudoDisponible; }
    public void setCantidadMenudoDisponible(BigDecimal cantidadMenudoDisponible) { this.cantidadMenudoDisponible = cantidadMenudoDisponible; }
    public BigDecimal getCantidadFinoDisponible() { return cantidadFinoDisponible; }
    public void setCantidadFinoDisponible(BigDecimal cantidadFinoDisponible) { this.cantidadFinoDisponible = cantidadFinoDisponible; }
    public LocalDateTime getFechaTransformacion() { return fechaTransformacion; }
    public void setFechaTransformacion(LocalDateTime fechaTransformacion) { this.fechaTransformacion = fechaTransformacion; }
}
