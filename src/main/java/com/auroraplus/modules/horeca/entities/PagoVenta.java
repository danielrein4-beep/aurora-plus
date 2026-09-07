package com.auroraplus.modules.horeca.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Una línea de pago dentro de un cobro (posiblemente mixto): una comanda puede
 * cerrarse con varias de estas, cada una en su propio método/moneda (ej. parte
 * en USD efectivo, resto en Bs por Pago Móvil). montoEquivalenteBase y
 * tasaAplicada quedan congelados al momento del cobro para que el reporte
 * histórico no cambie si la tasa BCV se actualiza después.
 */
@Entity
@Table(name = "pagos_venta")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class PagoVenta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comanda_id", nullable = false)
    private Comanda comanda;

    @Column(name = "metodo_pago", nullable = false, length = 20)
    private String metodoPago; // EFECTIVO, TARJETA, TRANSFERENCIA, BILLETERA_DIGITAL

    @Column(nullable = false, length = 3)
    private String moneda; // moneda en la que efectivamente se recibió esta línea

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal monto; // monto entregado por el cliente en esta línea, en `moneda`

    @Column(name = "monto_equivalente_base", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoEquivalenteBase;

    @Column(name = "tasa_aplicada", precision = 18, scale = 6)
    private BigDecimal tasaAplicada;

    @Column(name = "fecha_pago", nullable = false)
    private LocalDateTime fechaPago = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Comanda getComanda() { return comanda; }
    public void setComanda(Comanda comanda) { this.comanda = comanda; }
    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }
    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public BigDecimal getMontoEquivalenteBase() { return montoEquivalenteBase; }
    public void setMontoEquivalenteBase(BigDecimal montoEquivalenteBase) { this.montoEquivalenteBase = montoEquivalenteBase; }
    public BigDecimal getTasaAplicada() { return tasaAplicada; }
    public void setTasaAplicada(BigDecimal tasaAplicada) { this.tasaAplicada = tasaAplicada; }
    public LocalDateTime getFechaPago() { return fechaPago; }
    public void setFechaPago(LocalDateTime fechaPago) { this.fechaPago = fechaPago; }
}
