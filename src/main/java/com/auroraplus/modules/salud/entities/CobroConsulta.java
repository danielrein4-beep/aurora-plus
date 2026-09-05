package com.auroraplus.modules.salud.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Cobro de servicios médicos / consultas — Integrado al Motor Financiero Central
 * con soporte para idempotencia (Offline-First en recepción).
 */
@Entity
@Table(name = "salud_cobros_consulta", indexes = {
    @Index(name = "idx_salud_cobro_tenant_idemp", columnList = "tenant_id, clave_idempotencia", unique = true),
    @Index(name = "idx_salud_cobro_tenant_paciente", columnList = "tenant_id, paciente_id")
})
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class CobroConsulta {

    public enum MetodoPago {
        EFECTIVO,
        TRANSFERENCIA,
        PUNTO_VENTA,
        PAGO_MOVIL,
        ZELLE,
        OTRO
    }

    public enum EstadoCobro {
        PAGADO,
        ANULADO
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    /** Clave única generada por el frontend/POS para evitar cobros duplicados por reintentos de red. */
    @Column(name = "clave_idempotencia", nullable = false, length = 100)
    private String claveIdempotencia;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "paciente_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Paciente paciente;

    @Column(name = "consulta_id")
    private Long consultaId;

    @Column(name = "cita_id")
    private Long citaId;

    @Column(name = "procedimiento_id")
    private Long procedimientoId;

    @Column(name = "concepto", nullable = false, length = 255)
    private String concepto;

    @Column(name = "monto_total", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoTotal;

    @Column(name = "moneda_cobrada", nullable = false, length = 10)
    private String monedaCobrada = "USD";

    @Column(name = "monto_recibido", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoRecibido;

    @Column(name = "moneda_pago", nullable = false, length = 10)
    private String monedaPago = "USD";

    @Column(name = "tasa_cambio", precision = 18, scale = 6)
    private BigDecimal tasaCambio;

    @Enumerated(EnumType.STRING)
    @Column(name = "metodo_pago", nullable = false, length = 30)
    private MetodoPago metodoPago = MetodoPago.EFECTIVO;

    @Column(name = "referencia_pago", length = 100)
    private String referenciaPago;

    @Column(name = "fecha_hora", nullable = false)
    private LocalDateTime fechaHora = LocalDateTime.now();

    @Column(name = "cajero_usuario", length = 100)
    private String cajeroUsuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EstadoCobro estado = EstadoCobro.PAGADO;

    /** ID del movimiento de caja generado en el Motor Financiero Central. */
    @Column(name = "movimiento_caja_id")
    private Long movimientoCajaId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getClaveIdempotencia() { return claveIdempotencia; }
    public void setClaveIdempotencia(String claveIdempotencia) { this.claveIdempotencia = claveIdempotencia; }
    public Paciente getPaciente() { return paciente; }
    public void setPaciente(Paciente paciente) { this.paciente = paciente; }
    public Long getConsultaId() { return consultaId; }
    public void setConsultaId(Long consultaId) { this.consultaId = consultaId; }
    public Long getCitaId() { return citaId; }
    public void setCitaId(Long citaId) { this.citaId = citaId; }
    public Long getProcedimientoId() { return procedimientoId; }
    public void setProcedimientoId(Long procedimientoId) { this.procedimientoId = procedimientoId; }
    public String getConcepto() { return concepto; }
    public void setConcepto(String concepto) { this.concepto = concepto; }
    public BigDecimal getMontoTotal() { return montoTotal; }
    public void setMontoTotal(BigDecimal montoTotal) { this.montoTotal = montoTotal; }
    public String getMonedaCobrada() { return monedaCobrada; }
    public void setMonedaCobrada(String monedaCobrada) { this.monedaCobrada = monedaCobrada; }
    public BigDecimal getMontoRecibido() { return montoRecibido; }
    public void setMontoRecibido(BigDecimal montoRecibido) { this.montoRecibido = montoRecibido; }
    public String getMonedaPago() { return monedaPago; }
    public void setMonedaPago(String monedaPago) { this.monedaPago = monedaPago; }
    public BigDecimal getTasaCambio() { return tasaCambio; }
    public void setTasaCambio(BigDecimal tasaCambio) { this.tasaCambio = tasaCambio; }
    public MetodoPago getMetodoPago() { return metodoPago; }
    public void setMetodoPago(MetodoPago metodoPago) { this.metodoPago = metodoPago; }
    public String getReferenciaPago() { return referenciaPago; }
    public void setReferenciaPago(String referenciaPago) { this.referenciaPago = referenciaPago; }
    public LocalDateTime getFechaHora() { return fechaHora; }
    public void setFechaHora(LocalDateTime fechaHora) { this.fechaHora = fechaHora; }
    public String getCajeroUsuario() { return cajeroUsuario; }
    public void setCajeroUsuario(String cajeroUsuario) { this.cajeroUsuario = cajeroUsuario; }
    public EstadoCobro getEstado() { return estado; }
    public void setEstado(EstadoCobro estado) { this.estado = estado; }
    public Long getMovimientoCajaId() { return movimientoCajaId; }
    public void setMovimientoCajaId(Long movimientoCajaId) { this.movimientoCajaId = movimientoCajaId; }
}
