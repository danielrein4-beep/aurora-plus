package com.auroraplus.modules.horeca.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/**
 * Directorio de meseros del negocio (Salón & Mesas / Reportes) — antes el
 * nombre del mesero se tecleaba libre en cada comanda (Comanda.mesero sigue
 * siendo texto, sin FK a propósito: así una comanda vieja conserva el nombre
 * aunque el mesero ya no esté activo). Esta entidad solo existe para que el
 * dueño mantenga una lista propia con teléfono, y para ofrecerla como
 * sugerencia al abrir una comanda en vez de que cada quien la escriba distinto
 * ("Juan", "juan perez", "JUAN P.") y los reportes por mesero queden partidos.
 */
@Entity
@Table(name = "meseros_horeca")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class MeseroHoreca {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String nombre;

    private String telefono;

    @Column(nullable = false)
    private Boolean activo = true;

    // Vínculo OPCIONAL con un Empleado real de RRHH (reloj checador) — sin
    // esto, un negocio chico sigue usando el directorio de nombres tal cual
    // siempre. Con esto, Salón & Mesas puede mostrar "en turno ahora mismo"
    // consultando RegistroAsistencia, sin duplicar el fichaje acá.
    @Column(name = "empleado_id")
    private Long empleadoId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
    public Long getEmpleadoId() { return empleadoId; }
    public void setEmpleadoId(Long empleadoId) { this.empleadoId = empleadoId; }
}
