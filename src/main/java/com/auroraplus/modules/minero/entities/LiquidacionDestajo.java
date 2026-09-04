package com.auroraplus.modules.minero.entities;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Liquidación de destajo de una cuadrilla/pareja sobre una misma producción.
 * Dos modalidades (ver LiquidacionDestajoService):
 * - POR ROL: cada trabajador cobra la tarifa de su propio TipoTrabajoMinero
 *   (picador y carretero con tarifas distintas, tarifaConjunta queda null).
 * - TARIFA ÚNICA DE PAREJA: la cuadrilla completa negoció una sola tarifa
 *   (tarifaConjunta + monedaConjunta) y el pago se reparte entre los
 *   trabajadores por porcentajeParticipacion — el caso más común según el
 *   usuario ("casi siempre trabajan en conjunto... una tarifa única que se
 *   cuadra con ellos").
 */
@Entity
@Table(name = "liquidaciones_destajo")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class LiquidacionDestajo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "frente_corte")
    private String frenteCorte;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(name = "produccion_total", nullable = false, precision = 18, scale = 4)
    private BigDecimal produccionTotal; // toneladas o metros de avance, según el trabajo

    // No nulos SOLO en modalidad "tarifa única de pareja" — la tarifa acordada
    // para TODA la cuadrilla sobre produccionTotal, antes de repartir.
    @Column(name = "tarifa_conjunta", precision = 18, scale = 4)
    private BigDecimal tarifaConjunta;

    @Column(name = "moneda_conjunta", length = 3)
    private String monedaConjunta;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @OneToMany(mappedBy = "liquidacion", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<DetalleLiquidacionDestajo> detalles = new ArrayList<>();

    public void addDetalle(DetalleLiquidacionDestajo detalle) {
        detalles.add(detalle);
        detalle.setLiquidacion(this);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getFrenteCorte() { return frenteCorte; }
    public void setFrenteCorte(String frenteCorte) { this.frenteCorte = frenteCorte; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public BigDecimal getProduccionTotal() { return produccionTotal; }
    public void setProduccionTotal(BigDecimal produccionTotal) { this.produccionTotal = produccionTotal; }
    public BigDecimal getTarifaConjunta() { return tarifaConjunta; }
    public void setTarifaConjunta(BigDecimal tarifaConjunta) { this.tarifaConjunta = tarifaConjunta; }
    public String getMonedaConjunta() { return monedaConjunta; }
    public void setMonedaConjunta(String monedaConjunta) { this.monedaConjunta = monedaConjunta; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public List<DetalleLiquidacionDestajo> getDetalles() { return detalles; }
    public void setDetalles(List<DetalleLiquidacionDestajo> detalles) { this.detalles = detalles; }
}
