package com.auroraplus.core.inventario.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/**
 * Catálogo de cruce (compatibilidad pieza↔vehículo) de Aurora Retail /
 * Repuestos — un Articulo puede tener varias filas de cruce (sirve para
 * varios vehículos, o tiene varios códigos OEM equivalentes de distintos
 * fabricantes). Solo se usa/muestra en tenants con la vertical "repuestos"
 * activa; el resto de verticales (Ferretería, Farmacia, Horeca) no la tocan.
 */
@Entity
@Table(name = "cruces_repuesto")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class CruceRepuesto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    // EAGER: mismo criterio que PresentacionArticulo.articulo/LoteArticulo.articulo
    // en este mismo paquete — el Hibernate6Module global serializa cualquier
    // relación LAZY no inicializada como null en vez de cargarla.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "articulo_id", nullable = false)
    private Articulo articulo;

    @Column(name = "codigo_oem", nullable = false, length = 50)
    private String codigoOem;

    @Column(name = "marca_vehiculo", nullable = false, length = 60)
    private String marcaVehiculo;

    @Column(name = "modelo_vehiculo", nullable = false, length = 60)
    private String modeloVehiculo;

    // Rango de años en que aplica este cruce — ambos opcionales (null =
    // sin restricción de año, aplica a todas las versiones del modelo).
    @Column(name = "anio_desde")
    private Integer anioDesde;

    @Column(name = "anio_hasta")
    private Integer anioHasta;

    @Column(length = 255)
    private String notas;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Articulo getArticulo() { return articulo; }
    public void setArticulo(Articulo articulo) { this.articulo = articulo; }
    public String getCodigoOem() { return codigoOem; }
    public void setCodigoOem(String codigoOem) { this.codigoOem = codigoOem; }
    public String getMarcaVehiculo() { return marcaVehiculo; }
    public void setMarcaVehiculo(String marcaVehiculo) { this.marcaVehiculo = marcaVehiculo; }
    public String getModeloVehiculo() { return modeloVehiculo; }
    public void setModeloVehiculo(String modeloVehiculo) { this.modeloVehiculo = modeloVehiculo; }
    public Integer getAnioDesde() { return anioDesde; }
    public void setAnioDesde(Integer anioDesde) { this.anioDesde = anioDesde; }
    public Integer getAnioHasta() { return anioHasta; }
    public void setAnioHasta(Integer anioHasta) { this.anioHasta = anioHasta; }
    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
}
