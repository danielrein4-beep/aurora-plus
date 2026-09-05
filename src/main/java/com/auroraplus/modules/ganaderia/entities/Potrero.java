package com.auroraplus.modules.ganaderia.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/** Potrero/lote de pastoreo: unidad de ubicación física del hato, base del manejo rotacional. */
@Entity
@Table(name = "potreros")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Potrero {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String nombre;

    @Column(name = "area_hectareas", precision = 10, scale = 2)
    private BigDecimal areaHectareas;

    @Column(name = "capacidad_animales")
    private Integer capacidadAnimales;

    @Column(name = "tipo_pasto")
    private String tipoPasto;

    @Column(nullable = false, length = 20)
    private String estado = "ACTIVO"; // ACTIVO, EN_DESCANSO

    // Se fija al pasar a EN_DESCANSO (ver PotreroController) y se limpia al volver a ACTIVO —
    // así se puede calcular cuántos días lleva el suelo recuperándose sin cargar animales.
    @Column(name = "fecha_inicio_descanso")
    private LocalDate fechaInicioDescanso;

    // Se fija cuando el potrero vuelve a ACTIVO (ver PotreroRotacionService) — permite avisar
    // si un potrero lleva demasiado tiempo cargado sin rotar (sobrepastoreo).
    @Column(name = "fecha_inicio_uso")
    private LocalDate fechaInicioUso;

    // Días mínimos que debe permanecer EN_DESCANSO antes de poder recibir animales de nuevo —
    // sin esto, PotreroRotacionService no puede validar si un potrero "ya descansó lo suficiente".
    @Column(name = "dias_descanso_minimo")
    private Integer diasDescansoMinimo;

    // Posición en la secuencia de rotación (1, 2, 3...) — define qué potrero sigue después de
    // este en el ciclo de pastoreo rotacional (ver PotreroRotacionService.obtenerSiguienteEnRotacion).
    @Column(name = "orden_rotacion")
    private Integer ordenRotacion;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public BigDecimal getAreaHectareas() { return areaHectareas; }
    public void setAreaHectareas(BigDecimal areaHectareas) { this.areaHectareas = areaHectareas; }
    public Integer getCapacidadAnimales() { return capacidadAnimales; }
    public void setCapacidadAnimales(Integer capacidadAnimales) { this.capacidadAnimales = capacidadAnimales; }
    public String getTipoPasto() { return tipoPasto; }
    public void setTipoPasto(String tipoPasto) { this.tipoPasto = tipoPasto; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public LocalDate getFechaInicioDescanso() { return fechaInicioDescanso; }
    public void setFechaInicioDescanso(LocalDate fechaInicioDescanso) { this.fechaInicioDescanso = fechaInicioDescanso; }
    public LocalDate getFechaInicioUso() { return fechaInicioUso; }
    public void setFechaInicioUso(LocalDate fechaInicioUso) { this.fechaInicioUso = fechaInicioUso; }
    public Integer getDiasDescansoMinimo() { return diasDescansoMinimo; }
    public void setDiasDescansoMinimo(Integer diasDescansoMinimo) { this.diasDescansoMinimo = diasDescansoMinimo; }
    public Integer getOrdenRotacion() { return ordenRotacion; }
    public void setOrdenRotacion(Integer ordenRotacion) { this.ordenRotacion = ordenRotacion; }

    @Transient
    public Long getDiasEnDescanso() {
        if (!"EN_DESCANSO".equals(estado) || fechaInicioDescanso == null) return null;
        return ChronoUnit.DAYS.between(fechaInicioDescanso, LocalDate.now());
    }

    @Transient
    public Long getDiasEnUso() {
        if (!"ACTIVO".equals(estado) || fechaInicioUso == null) return null;
        return ChronoUnit.DAYS.between(fechaInicioUso, LocalDate.now());
    }

    /** true si ya cumplió los días mínimos de descanso (o si no se configuró un mínimo, cualquier descanso ya cuenta como suficiente). */
    @Transient
    public boolean isListoParaVolverAUso() {
        Long dias = getDiasEnDescanso();
        if (dias == null) return false;
        return diasDescansoMinimo == null || dias >= diasDescansoMinimo;
    }
}
