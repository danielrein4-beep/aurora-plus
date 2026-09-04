package com.auroraplus.modules.tamanacocomercial.entities;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "facturas_comercial")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Factura {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "numero_control", nullable = false, unique = true)
    private String numeroControl;

    @Column(name = "fecha_emision", nullable = false)
    private LocalDate fechaEmision;

    @Column(name = "cliente_nombre", nullable = false)
    private String clienteNombre;

    @Column(name = "cliente_rif", nullable = false)
    private String clienteRif;

    @Column(name = "cliente_direccion", nullable = false)
    private String clienteDireccion;

    @Column(nullable = false)
    private String concepto;

    @Column(nullable = false, length = 3)
    private String moneda; // USD, VES

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "porcentaje_iva", nullable = false, precision = 5, scale = 2)
    private BigDecimal porcentajeIva;

    @Column(name = "monto_iva", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoIva;

    @Column(name = "aplica_igtf", nullable = false)
    private Boolean aplicaIgtf;

    @Column(name = "porcentaje_igtf", nullable = false, precision = 5, scale = 2)
    private BigDecimal porcentajeIgtf;

    @Column(name = "monto_igtf", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoIgtf;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal total;

    @Column(nullable = false)
    private String estado = "EMITIDA"; // EMITIDA, PAGADA, ANULADA

    @OneToMany(mappedBy = "factura", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<Retencion> retenciones = new ArrayList<>();

    public void addRetencion(Retencion retencion) {
        retenciones.add(retencion);
        retencion.setFactura(this);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNumeroControl() { return numeroControl; }
    public void setNumeroControl(String numeroControl) { this.numeroControl = numeroControl; }
    public LocalDate getFechaEmision() { return fechaEmision; }
    public void setFechaEmision(LocalDate fechaEmision) { this.fechaEmision = fechaEmision; }
    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }
    public String getClienteRif() { return clienteRif; }
    public void setClienteRif(String clienteRif) { this.clienteRif = clienteRif; }
    public String getClienteDireccion() { return clienteDireccion; }
    public void setClienteDireccion(String clienteDireccion) { this.clienteDireccion = clienteDireccion; }
    public String getConcepto() { return concepto; }
    public void setConcepto(String concepto) { this.concepto = concepto; }
    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public BigDecimal getPorcentajeIva() { return porcentajeIva; }
    public void setPorcentajeIva(BigDecimal porcentajeIva) { this.porcentajeIva = porcentajeIva; }
    public BigDecimal getMontoIva() { return montoIva; }
    public void setMontoIva(BigDecimal montoIva) { this.montoIva = montoIva; }
    public Boolean getAplicaIgtf() { return aplicaIgtf; }
    public void setAplicaIgtf(Boolean aplicaIgtf) { this.aplicaIgtf = aplicaIgtf; }
    public BigDecimal getPorcentajeIgtf() { return porcentajeIgtf; }
    public void setPorcentajeIgtf(BigDecimal porcentajeIgtf) { this.porcentajeIgtf = porcentajeIgtf; }
    public BigDecimal getMontoIgtf() { return montoIgtf; }
    public void setMontoIgtf(BigDecimal montoIgtf) { this.montoIgtf = montoIgtf; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public List<Retencion> getRetenciones() { return retenciones; }
    public void setRetenciones(List<Retencion> retenciones) { this.retenciones = retenciones; }
}
