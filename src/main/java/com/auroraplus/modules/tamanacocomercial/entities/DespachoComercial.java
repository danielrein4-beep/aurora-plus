package com.auroraplus.modules.tamanacocomercial.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Registro comercial de despacho de carbón (chofer, placa, mina de origen y
 * peso), adaptado del proyecto "inventario" (Carbones Tamanaco). Vive aislado
 * en el módulo tamanacocomercial: no reemplaza ni depende de modules.minero,
 * que cubre la operación de extracción, no la comercialización/despacho.
 */
@Entity
@Table(name = "despachos_comerciales")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class DespachoComercial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String chofer;

    @Column(nullable = false, length = 15)
    private String placa;

    @Column(nullable = false)
    private String mina;

    @Column(nullable = false, precision = 18, scale = 4)
    private BigDecimal peso;

    @Column(name = "fecha_despacho", nullable = false)
    private LocalDateTime fechaDespacho = LocalDateTime.now();

    @Column(name = "ticket_url")
    private String ticketUrl;

    // Historial de chofer por cédula (relación adicional; 'chofer' arriba sigue
    // siendo la fuente de verdad para Nómina/Auditoría/reportes existentes).
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chofer_id", nullable = true)
    private Chofer choferRef;

    // No persistido: cédula enviada desde el formulario para buscar/crear el Chofer histórico.
    @Transient
    private String cedulaChofer;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getChofer() { return chofer; }
    public void setChofer(String chofer) { this.chofer = chofer; }
    public String getPlaca() { return placa; }
    public void setPlaca(String placa) { this.placa = placa != null ? placa.trim().toUpperCase() : null; }
    public String getMina() { return mina; }
    public void setMina(String mina) { this.mina = mina != null ? mina.trim().toUpperCase() : null; }
    public BigDecimal getPeso() { return peso; }
    public void setPeso(BigDecimal peso) { this.peso = peso; }
    public LocalDateTime getFechaDespacho() { return fechaDespacho; }
    public void setFechaDespacho(LocalDateTime fechaDespacho) { this.fechaDespacho = fechaDespacho; }
    public String getTicketUrl() { return ticketUrl; }
    public void setTicketUrl(String ticketUrl) { this.ticketUrl = ticketUrl; }
    public Chofer getChoferRef() { return choferRef; }
    public void setChoferRef(Chofer choferRef) { this.choferRef = choferRef; }
    public String getCedulaChofer() { return cedulaChofer; }
    public void setCedulaChofer(String cedulaChofer) { this.cedulaChofer = cedulaChofer; }
}
