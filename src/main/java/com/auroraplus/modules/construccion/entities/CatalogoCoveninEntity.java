package com.auroraplus.modules.construccion.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "catalogo_partidas_covenin")
public class CatalogoCoveninEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "codigo_covenin", nullable = false, unique = true, length = 50)
    private String codigoCovenin;

    @Column(name = "capitulo_codigo", nullable = false, length = 50)
    private String capituloCodigo;

    @Column(name = "capitulo_nombre", nullable = false)
    private String capituloNombre;

    @Column(name = "descripcion", nullable = false, columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "unidad", nullable = false, length = 20)
    private String unidad;

    @Column(name = "precio_referencial", precision = 18, scale = 2)
    private BigDecimal precioReferencial = BigDecimal.ZERO;

    @Column(name = "rendimiento_promedio", precision = 12, scale = 2)
    private BigDecimal rendimientoPromedio = BigDecimal.ZERO;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCodigoCovenin() { return codigoCovenin; }
    public void setCodigoCovenin(String codigoCovenin) { this.codigoCovenin = codigoCovenin; }

    public String getCapituloCodigo() { return capituloCodigo; }
    public void setCapituloCodigo(String capituloCodigo) { this.capituloCodigo = capituloCodigo; }

    public String getCapituloNombre() { return capituloNombre; }
    public void setCapituloNombre(String capituloNombre) { this.capituloNombre = capituloNombre; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public String getUnidad() { return unidad; }
    public void setUnidad(String unidad) { this.unidad = unidad; }

    public BigDecimal getPrecioReferencial() { return precioReferencial; }
    public void setPrecioReferencial(BigDecimal precioReferencial) { this.precioReferencial = precioReferencial; }

    public BigDecimal getRendimientoPromedio() { return rendimientoPromedio; }
    public void setRendimientoPromedio(BigDecimal rendimientoPromedio) { this.rendimientoPromedio = rendimientoPromedio; }
}
