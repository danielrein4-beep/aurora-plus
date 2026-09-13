package com.auroraplus.core.personal.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * docs/personal-nomina-contract.md §4 — única vía para "corregir" una NominaEmpleado ya
 * APROBADA/PAGADA. CORRECCION agrega un ajuste sin tocar las líneas ya calculadas; REVERSO marca
 * el origen como REVERSADA y, si aplica, apunta a una nómina de reemplazo nueva en BORRADOR.
 */
@Entity
@Table(name = "ajustes_nomina")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class AjusteNomina {

    public enum Tipo { CORRECCION, REVERSO }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "nomina_empleado_id", nullable = false)
    private Long nominaEmpleadoId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Tipo tipo;

    @Column(nullable = false, length = 500)
    private String motivo;

    // Solo aplica a CORRECCION (cuánto se ajusta el neto). Null en REVERSO.
    @Column(name = "monto_ajuste", precision = 18, scale = 2)
    private BigDecimal montoAjuste;

    @Column(length = 3)
    private String moneda;

    // Solo aplica a REVERSO — la nómina en BORRADOR creada para reemplazar a la reversada.
    @Column(name = "nomina_empleado_reemplazo_id")
    private Long nominaEmpleadoReemplazoId;

    @Column(name = "creado_por", nullable = false)
    private Long creadoPorUsuarioId;

    @Column(nullable = false)
    private LocalDateTime fecha = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Long getNominaEmpleadoId() { return nominaEmpleadoId; }
    public void setNominaEmpleadoId(Long nominaEmpleadoId) { this.nominaEmpleadoId = nominaEmpleadoId; }
    public Tipo getTipo() { return tipo; }
    public void setTipo(Tipo tipo) { this.tipo = tipo; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
    public BigDecimal getMontoAjuste() { return montoAjuste; }
    public void setMontoAjuste(BigDecimal montoAjuste) { this.montoAjuste = montoAjuste; }
    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }
    public Long getNominaEmpleadoReemplazoId() { return nominaEmpleadoReemplazoId; }
    public void setNominaEmpleadoReemplazoId(Long nominaEmpleadoReemplazoId) { this.nominaEmpleadoReemplazoId = nominaEmpleadoReemplazoId; }
    public Long getCreadoPorUsuarioId() { return creadoPorUsuarioId; }
    public void setCreadoPorUsuarioId(Long creadoPorUsuarioId) { this.creadoPorUsuarioId = creadoPorUsuarioId; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
}
