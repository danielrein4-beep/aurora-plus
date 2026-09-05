package com.auroraplus.modules.ganaderia.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/**
 * Grupo/lote de ordeño: varios animales que se ordeñan juntos, en un orden
 * fijo dentro de la rutina diaria (ej. "Grupo A" primero a las 5:00am por alta
 * producción, "Grupo B" después). Sin esto, el registro de ordeño era
 * puramente individual, sin ninguna organización de rutina.
 */
@Entity
@Table(name = "grupos_ordeno")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class GrupoOrdeno {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String nombre;

    // Libre (ej. "5:00 AM", "Después del primer grupo") — no se fuerza un formato de hora
    // porque en campo la rutina real rara vez es un horario exacto.
    private String horario;

    // Orden en el que se ordeñan los grupos ese turno (1 = primero).
    @Column(name = "orden_rotacion")
    private Integer ordenRotacion;

    @Column(nullable = false)
    private boolean activo = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getHorario() { return horario; }
    public void setHorario(String horario) { this.horario = horario; }
    public Integer getOrdenRotacion() { return ordenRotacion; }
    public void setOrdenRotacion(Integer ordenRotacion) { this.ordenRotacion = ordenRotacion; }
    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }
}
