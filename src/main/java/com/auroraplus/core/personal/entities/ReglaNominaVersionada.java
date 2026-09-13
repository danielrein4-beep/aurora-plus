package com.auroraplus.core.personal.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * docs/personal-nomina-contract.md §3 — INMUTABLE una vez creada. "Editar una regla" nunca hace
 * UPDATE sobre valorNumerico de una fila existente: crea una fila nueva con vigenciaDesde = hoy
 * y cierra vigenciaHasta de la anterior. El motor de nómina resuelve la regla vigente A LA FECHA
 * DEL PERÍODO que está calculando (nunca "la más reciente sin importar fecha"), y un
 * DetalleNomina ya calculado guarda el id exacto de la fila que usó — por diseño, un período ya
 * calculado no puede cambiar aunque después se cree una versión nueva de la regla.
 *
 * tipoRegla es texto libre a propósito: este motor no conoce de antemano todas las reglas
 * laborales de todos los países donde Aurora pueda operar — el tenant/admin define el catálogo
 * (ej. "PORCENTAJE_DEDUCCION", "DIAS_VACACIONES_ANUAL", "FORMULA_HORA_EXTRA"). Nunca se afirma
 * cumplimiento legal automático: es responsabilidad del tenant configurar valores correctos.
 */
@Entity
@Table(name = "reglas_nomina_versionadas")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class ReglaNominaVersionada {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    // Nullable — algunas reglas son generales (ej. "días de vacaciones/año"), no atadas a un
    // ConceptoNomina puntual.
    @Column(name = "concepto_id")
    private Long conceptoId;

    @Column(name = "tipo_regla", nullable = false, length = 60)
    private String tipoRegla;

    @Column(name = "valor_numerico", nullable = false, precision = 18, scale = 6)
    private BigDecimal valorNumerico;

    @Column(length = 3)
    private String moneda;

    @Column(name = "vigencia_desde", nullable = false)
    private LocalDate vigenciaDesde;

    // Null = vigente.
    @Column(name = "vigencia_hasta")
    private LocalDate vigenciaHasta;

    @Column(name = "creado_por")
    private Long creadoPorUsuarioId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Long getConceptoId() { return conceptoId; }
    public void setConceptoId(Long conceptoId) { this.conceptoId = conceptoId; }
    public String getTipoRegla() { return tipoRegla; }
    public void setTipoRegla(String tipoRegla) { this.tipoRegla = tipoRegla; }
    public BigDecimal getValorNumerico() { return valorNumerico; }
    public void setValorNumerico(BigDecimal valorNumerico) { this.valorNumerico = valorNumerico; }
    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }
    public LocalDate getVigenciaDesde() { return vigenciaDesde; }
    public void setVigenciaDesde(LocalDate vigenciaDesde) { this.vigenciaDesde = vigenciaDesde; }
    public LocalDate getVigenciaHasta() { return vigenciaHasta; }
    public void setVigenciaHasta(LocalDate vigenciaHasta) { this.vigenciaHasta = vigenciaHasta; }
    public Long getCreadoPorUsuarioId() { return creadoPorUsuarioId; }
    public void setCreadoPorUsuarioId(Long creadoPorUsuarioId) { this.creadoPorUsuarioId = creadoPorUsuarioId; }
}
