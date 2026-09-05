package com.auroraplus.modules.ganaderia.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

/** Registro de ordeño por animal y turno — base de los reportes de producción lechera. */
@Entity
@Table(name = "registros_ordeno")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class RegistroOrdeno {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "animal_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Animal animal;

    // Copiado de animal.grupoOrdeno AL MOMENTO de registrar (ver RegistroOrdenoController) — así
    // el histórico no cambia si el animal se reasigna a otro grupo más adelante. Nulo si el
    // animal no pertenecía a ningún grupo cuando se ordeñó.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "grupo_ordeno_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private GrupoOrdeno grupoOrdeno;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false, length = 10)
    private String turno; // MAÑANA, TARDE

    @Column(name = "cantidad_litros", nullable = false, precision = 10, scale = 2)
    private BigDecimal cantidadLitros;

    // Precio de venta del litro EN ESTE momento (el precio de la leche varía en el tiempo) —
    // snapshot al registrar, igual que grupoOrdeno. Opcional: si no se indica, este registro
    // solo cuenta para producción (litros), no para el reporte de ingresos.
    @Column(name = "precio_venta_litro", precision = 10, scale = 4)
    private BigDecimal precioVentaLitro;

    @Column(name = "porcentaje_grasa", precision = 5, scale = 2)
    private BigDecimal porcentajeGrasa;

    @Column(name = "porcentaje_proteina", precision = 5, scale = 2)
    private BigDecimal porcentajeProteina;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Animal getAnimal() { return animal; }
    public void setAnimal(Animal animal) { this.animal = animal; }
    public GrupoOrdeno getGrupoOrdeno() { return grupoOrdeno; }
    public void setGrupoOrdeno(GrupoOrdeno grupoOrdeno) { this.grupoOrdeno = grupoOrdeno; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public String getTurno() { return turno; }
    public void setTurno(String turno) { this.turno = turno; }
    public BigDecimal getCantidadLitros() { return cantidadLitros; }
    public void setCantidadLitros(BigDecimal cantidadLitros) { this.cantidadLitros = cantidadLitros; }
    public BigDecimal getPorcentajeGrasa() { return porcentajeGrasa; }
    public void setPorcentajeGrasa(BigDecimal porcentajeGrasa) { this.porcentajeGrasa = porcentajeGrasa; }
    public BigDecimal getPorcentajeProteina() { return porcentajeProteina; }
    public void setPorcentajeProteina(BigDecimal porcentajeProteina) { this.porcentajeProteina = porcentajeProteina; }
    public BigDecimal getPrecioVentaLitro() { return precioVentaLitro; }
    public void setPrecioVentaLitro(BigDecimal precioVentaLitro) { this.precioVentaLitro = precioVentaLitro; }

    @Transient
    public BigDecimal getMontoVenta() {
        if (precioVentaLitro == null || cantidadLitros == null) return null;
        return cantidadLitros.multiply(precioVentaLitro).setScale(2, RoundingMode.HALF_UP);
    }
}
