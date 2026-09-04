package com.auroraplus.modules.ganaderia.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Period;

/**
 * Cabeza de ganado individual — a diferencia de repuestos/moda, cada animal
 * es una entidad única (no stock fungible): tiene identidad propia (arete),
 * genealogía y trazabilidad completa de ubicación, peso, sanidad y
 * reproducción a lo largo de su vida productiva.
 */
@Entity
@Table(name = "animales", indexes = {
    @Index(name = "idx_animal_tenant_arete", columnList = "tenant_id, arete")
})
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Animal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false, unique = true, length = 30)
    private String arete;

    private String nombre;

    @Column(nullable = false, length = 30)
    private String especie = "BOVINO"; // BOVINO, CAPRINO, OVINO, PORCINO...

    private String raza;

    @Column(nullable = false, length = 10)
    private String sexo; // MACHO, HEMBRA

    // Libre (varía por región/especie): TERNERO, NOVILLA, VACA, TORO, etc.
    @Column(name = "tipo_animal")
    private String tipoAnimal;

    @Column(name = "fecha_nacimiento")
    private LocalDate fechaNacimiento;

    @Column(name = "peso_actual", precision = 10, scale = 2)
    private BigDecimal pesoActual;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "potrero_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Potrero potrero;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "madre_id")
    private Animal madre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "padre_id")
    private Animal padre;

    @Column(nullable = false, length = 20)
    private String estado = "ACTIVO"; // ACTIVO, VENDIDO, MUERTO

    // Costo de adquisición (compra o valorización del nacimiento) — igual que
    // costoUnitario en repuestos/moda, permite ver utilidad real al vender.
    @Column(name = "costo_adquisicion", precision = 18, scale = 2)
    private BigDecimal costoAdquisicion;

    // ARETE (físico numerado), CHIP (RFID subcutáneo) o QR (etiqueta impresa con código QR).
    @Column(name = "tipo_identificador", length = 10)
    private String tipoIdentificador = "ARETE";

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getArete() { return arete; }
    public void setArete(String arete) { this.arete = arete; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getEspecie() { return especie; }
    public void setEspecie(String especie) { this.especie = especie; }
    public String getRaza() { return raza; }
    public void setRaza(String raza) { this.raza = raza; }
    public String getSexo() { return sexo; }
    public void setSexo(String sexo) { this.sexo = sexo; }
    public String getTipoAnimal() { return tipoAnimal; }
    public void setTipoAnimal(String tipoAnimal) { this.tipoAnimal = tipoAnimal; }
    public LocalDate getFechaNacimiento() { return fechaNacimiento; }
    public void setFechaNacimiento(LocalDate fechaNacimiento) { this.fechaNacimiento = fechaNacimiento; }
    public BigDecimal getPesoActual() { return pesoActual; }
    public void setPesoActual(BigDecimal pesoActual) { this.pesoActual = pesoActual; }
    public Potrero getPotrero() { return potrero; }
    public void setPotrero(Potrero potrero) { this.potrero = potrero; }
    public Animal getMadre() { return madre; }
    public void setMadre(Animal madre) { this.madre = madre; }
    public Animal getPadre() { return padre; }
    public void setPadre(Animal padre) { this.padre = padre; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public BigDecimal getCostoAdquisicion() { return costoAdquisicion; }
    public void setCostoAdquisicion(BigDecimal costoAdquisicion) { this.costoAdquisicion = costoAdquisicion; }
    public String getTipoIdentificador() { return tipoIdentificador; }
    public void setTipoIdentificador(String tipoIdentificador) { this.tipoIdentificador = tipoIdentificador; }

    /**
     * Clasificación automática por edad/sexo (Bovino, la más común — para otras
     * especies el tipoAnimal manual sigue disponible). No sobrescribe
     * tipoAnimal si ya fue asignado a mano; es una sugerencia calculada.
     */
    @Transient
    public String getCategoriaAutomatica() {
        if (fechaNacimiento == null || sexo == null) return null;
        int edadMeses = Period.between(fechaNacimiento, LocalDate.now()).getYears() * 12
            + Period.between(fechaNacimiento, LocalDate.now()).getMonths();

        boolean macho = "MACHO".equalsIgnoreCase(sexo);
        if (edadMeses < 12) return macho ? "TERNERO" : "TERNERA";
        if (edadMeses < 24) return macho ? "NOVILLO" : "NOVILLA";
        return macho ? "TORO" : "VACA";
    }
}
