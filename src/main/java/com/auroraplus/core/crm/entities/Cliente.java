package com.auroraplus.core.crm.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * CRM básico (Fase 3 del plan de escalamiento): un cliente identificado por
 * nombre/RIF, opcionalmente asociado a una venta. Deliberadamente liviano —
 * no toca el flujo caliente del POS: una venta puede cerrarse sin cliente
 * (anónima) exactamente igual que antes.
 */
@Entity
@Table(name = "clientes")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String nombre;

    @Column(name = "identificacion_rif")
    private String identificacionRif;

    private String telefono;
    private String correo;

    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    /** Regla ABC (ver ClasificacionClientesJob): recalculada cada madrugada según su
     * historial de compras real — nunca se elige a mano desde el CRUD de clientes. */
    public enum Clasificacion { NORMAL, FRECUENTE, MAYORISTA, EN_RIESGO }

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Clasificacion clasificacion = Clasificacion.NORMAL;

    // Descuento que el POS aplica solo (sin que el cajero lo escriba) cuando
    // este cliente está marcado MAYORISTA — null/0 para el resto de clasificaciones.
    @Column(name = "descuento_automatico_porcentaje", precision = 5, scale = 2)
    private BigDecimal descuentoAutomaticoPorcentaje;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getIdentificacionRif() { return identificacionRif; }
    public void setIdentificacionRif(String identificacionRif) { this.identificacionRif = identificacionRif; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }
    public LocalDateTime getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(LocalDateTime fechaRegistro) { this.fechaRegistro = fechaRegistro; }
    public Clasificacion getClasificacion() { return clasificacion; }
    public void setClasificacion(Clasificacion clasificacion) { this.clasificacion = clasificacion; }
    public BigDecimal getDescuentoAutomaticoPorcentaje() { return descuentoAutomaticoPorcentaje; }
    public void setDescuentoAutomaticoPorcentaje(BigDecimal descuentoAutomaticoPorcentaje) { this.descuentoAutomaticoPorcentaje = descuentoAutomaticoPorcentaje; }
}
