package com.auroraplus.core.financiero.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Cuenta/caja con saldo propio (ej. "Caja Efectivo", "Cuenta Dólares", "Banco
 * Mercantil") — a diferencia de MovimientoCaja (que registra CADA venta/gasto
 * agregado por moneda, sin decir en qué cuenta física quedó el dinero), esto
 * responde "¿dónde está guardado el dinero ahora?". El saldo se guarda (no se
 * recalcula sumando movimientos) porque el dueño necesita poder corregirlo a
 * mano tras un conteo físico, igual que el stock de un producto.
 */
@Entity
@Table(name = "cuentas_bancarias")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class CuentaBancaria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false, length = 80)
    private String nombre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Tipo tipo = Tipo.BANCO;

    @Column(nullable = false, length = 3)
    private String moneda; // USD, VES, COP

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal saldo = BigDecimal.ZERO;

    @Column(nullable = false)
    private Boolean activa = true;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    // Marca esta cuenta como auto-provista desde un método de pago ya configurado
    // en Configuración > Pagos (PAGO_MOVIL, ZELLE, BINANCE, BANCOLOMBIA) — null =
    // cuenta creada a mano por el dueño (ej. "Banco Mercantil"). Sirve para dos
    // cosas: no duplicar la cuenta en cada sincronización, y poder OCULTARLA (sin
    // borrar su saldo/historial) si el dueño después desactiva ese método en Pagos.
    @Column(name = "metodo_pago_vinculado", length = 20)
    private String metodoPagoVinculado;

    public enum Tipo { EFECTIVO, BANCO, PAGO_MOVIL, BILLETERA_DIGITAL, OTRO }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public Tipo getTipo() { return tipo; }
    public void setTipo(Tipo tipo) { this.tipo = tipo; }
    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }
    public BigDecimal getSaldo() { return saldo; }
    public void setSaldo(BigDecimal saldo) { this.saldo = saldo; }
    public Boolean getActiva() { return activa; }
    public void setActiva(Boolean activa) { this.activa = activa; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
    public String getMetodoPagoVinculado() { return metodoPagoVinculado; }
    public void setMetodoPagoVinculado(String metodoPagoVinculado) { this.metodoPagoVinculado = metodoPagoVinculado; }
}
