package com.auroraplus.modules.horeca.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

@Entity
@Table(name = "items_comanda")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class ItemComanda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comanda_id", nullable = false)
    private Comanda comanda;

    // Nulo para cargos manuales sin receta (ej. "Cover", propina sugerida). Cuando
    // está presente, agregar el ítem descuenta automáticamente sus ingredientes.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "escandallo_id")
    private EscandalloReceta escandallo;

    @Column(name = "nombre_plato", nullable = false)
    private String nombrePlato;

    @Column(name = "estacion_cocina", nullable = false)
    private String estacionCocina; // Ej: PARRILLA, BAR, COCINA_FRIA

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_item", nullable = false, length = 20)
    private EstadoItem estadoItem;

    @Column(nullable = false)
    private Integer cantidad;

    @Column(name = "precio_unitario", nullable = false, precision = 18, scale = 2)
    private BigDecimal precioUnitario;

    public enum EstadoItem { PENDIENTE, PREPARANDO, LISTO, ENTREGADO }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Comanda getComanda() { return comanda; }
    public void setComanda(Comanda comanda) { this.comanda = comanda; }
    public EscandalloReceta getEscandallo() { return escandallo; }
    public void setEscandallo(EscandalloReceta escandallo) { this.escandallo = escandallo; }
    public String getNombrePlato() { return nombrePlato; }
    public void setNombrePlato(String nombrePlato) { this.nombrePlato = nombrePlato; }
    public String getEstacionCocina() { return estacionCocina; }
    public void setEstacionCocina(String estacionCocina) { this.estacionCocina = estacionCocina; }
    public EstadoItem getEstadoItem() { return estadoItem; }
    public void setEstadoItem(EstadoItem estadoItem) { this.estadoItem = estadoItem; }
    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }
    public BigDecimal getPrecioUnitario() { return precioUnitario; }
    public void setPrecioUnitario(BigDecimal precioUnitario) { this.precioUnitario = precioUnitario; }
}
