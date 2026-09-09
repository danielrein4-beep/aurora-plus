package com.auroraplus.modules.salud.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;

/**
 * Un caso histórico (o un conteo agregado de casos) de un diagnóstico CIE-10,
 * cargado desde un archivo Excel de boletines epidemiológicos oficiales —
 * NO es una consulta médica real, es un dato de respaldo para que el Canal
 * Endémico tenga historia desde el primer día, sin esperar 5-7 años
 * acumulando datos propios de la clínica (ver SaludImportacionHistoricaService).
 *
 * Se guarda separado de {@link ConsultaMedica} a propósito: mezclar un
 * "caso importado sin paciente real" con la tabla de consultas reales
 * rompería cualquier reporte que dependa de tener un paciente/expediente de
 * verdad detrás.
 */
@Entity
@Table(name = "salud_casos_historicos_importados", indexes = {
    @Index(name = "idx_caso_hist_tenant_cie10_anio", columnList = "tenant_id, diagnostico_cie10, anio")
})
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class CasoHistoricoImportado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "diagnostico_cie10", nullable = false, length = 20)
    private String diagnosticoCie10;

    @Column(nullable = false)
    private Integer anio;

    /** Semana epidemiológica (1-53) si el boletín trae ese nivel de detalle — nulo si solo hay dato mensual o anual. */
    @Column
    private Integer semana;

    /** Mes calendario (1-12) si el boletín trae detalle mensual (y no semanal) — nulo si el dato es semanal o solo anual. */
    @Column
    private Integer mes;

    @Column(nullable = false)
    private Integer casos;

    /** De dónde salió este dato — ej. "boletin_ministerio_2019_2023.xlsx", para poder rastrear el origen si algo se ve raro. */
    @Column(length = 255)
    private String fuente;

    @Column(name = "fecha_importacion", nullable = false)
    private LocalDateTime fechaImportacion = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getDiagnosticoCie10() { return diagnosticoCie10; }
    public void setDiagnosticoCie10(String diagnosticoCie10) { this.diagnosticoCie10 = diagnosticoCie10; }
    public Integer getAnio() { return anio; }
    public void setAnio(Integer anio) { this.anio = anio; }
    public Integer getSemana() { return semana; }
    public void setSemana(Integer semana) { this.semana = semana; }
    public Integer getMes() { return mes; }
    public void setMes(Integer mes) { this.mes = mes; }
    public Integer getCasos() { return casos; }
    public void setCasos(Integer casos) { this.casos = casos; }
    public String getFuente() { return fuente; }
    public void setFuente(String fuente) { this.fuente = fuente; }
    public LocalDateTime getFechaImportacion() { return fechaImportacion; }
    public void setFechaImportacion(LocalDateTime fechaImportacion) { this.fechaImportacion = fechaImportacion; }
}
