package com.auroraplus.modules.ganaderia.entities;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

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

    // Código corto opcional del potrero (ej. "POT-01"), solo referencia visual para el ganadero.
    private String codigo;

    // Color hexadecimal elegido por el usuario para distinguirlo en el mapa/listas
    // (ej. "#10B981") — si no se guarda, el mapa cae a un color por defecto según el estado.
    @Column(length = 20)
    private String color;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    // El polígono real trazado sobre el mapa satelital (lista de [lat, lng]) se guarda como
    // JSON en esta columna — sin esto, el potrero "trazado" perdía su forma real al recargar
    // y el mapa lo re-dibujaba en una posición y tamaño inventados junto a la finca.
    @Column(name = "poligono_json", columnDefinition = "TEXT")
    private String poligonoJson;

    private static final ObjectMapper POLIGONO_MAPPER = new ObjectMapper();

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

    // Mapeo visual OPCIONAL del potrero en un plano de la finca (mismo patrón que Mesa en
    // Horeca) — nulo por defecto: la rotación y las alertas funcionan igual sin esto. Solo
    // para el ganadero que sí quiera ver un plano de su finca, no es obligatorio para nadie.
    private Integer posX;
    private Integer posY;
    private Integer ancho;
    private Integer alto;
    private String forma = "RECTANGULAR"; // RECTANGULAR o REDONDA — cómo dibujarlo

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
    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }

    @Transient
    @SuppressWarnings("unchecked")
    public List<double[]> getPoligono() {
        if (poligonoJson == null || poligonoJson.isBlank()) return null;
        try {
            List<List<Double>> crudo = POLIGONO_MAPPER.readValue(poligonoJson, List.class);
            List<double[]> resultado = new ArrayList<>();
            for (List<Double> punto : crudo) {
                resultado.add(new double[]{ punto.get(0), punto.get(1) });
            }
            return resultado;
        } catch (Exception e) {
            return null; // JSON corrupto — la ficha se muestra igual, solo sin el polígono trazado.
        }
    }

    public void setPoligono(List<double[]> poligono) {
        if (poligono == null || poligono.isEmpty()) {
            this.poligonoJson = null;
            return;
        }
        try {
            this.poligonoJson = POLIGONO_MAPPER.writeValueAsString(poligono);
        } catch (Exception e) {
            this.poligonoJson = null;
        }
    }
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
    public Integer getPosX() { return posX; }
    public void setPosX(Integer posX) { this.posX = posX; }
    public Integer getPosY() { return posY; }
    public void setPosY(Integer posY) { this.posY = posY; }
    public Integer getAncho() { return ancho; }
    public void setAncho(Integer ancho) { this.ancho = ancho; }
    public Integer getAlto() { return alto; }
    public void setAlto(Integer alto) { this.alto = alto; }
    public String getForma() { return forma; }
    public void setForma(String forma) { this.forma = forma; }

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
