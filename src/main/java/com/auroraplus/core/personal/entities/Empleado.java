package com.auroraplus.core.personal.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.time.LocalDate;

/**
 * docs/personal-nomina-contract.md §2.1.1 — usuarioId es OPCIONAL a propósito: un empleado (ej.
 * un peón de finca o un ayudante de cocina) puede existir en nómina sin nunca iniciar sesión en
 * Aurora. Obligarlo a tener credenciales sería forzar una cuenta que nadie va a usar.
 */
// Nombre de entidad y de tabla explícitos: ya existen modules.tamanacocomercial.entities.Empleado
// Y core.rrhh.entities.Empleado (JPA "EmpleadoRrhh") apuntando a una tabla física "empleados" —
// tres clases Java distintas sobre el mismo nombre de tabla es un choque real que se encontró al
// integrar este módulo (core.rrhh no tiene siquiera una migración que cree esa tabla, parece
// código incompleto ya presente en esta rama, ver docs/personal-nomina-contract.md §6).
@Entity(name = "EmpleadoPersonal")
@Table(name = "personal_empleados")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Empleado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "nombre_completo", nullable = false)
    private String nombreCompleto;

    @Column(name = "documento_identidad", nullable = false, length = 30)
    private String documentoIdentidad;

    @Column(name = "fecha_ingreso", nullable = false)
    private LocalDate fechaIngreso;

    // Null = todavía activo. No se borra el empleado al salir de la empresa — se conserva para
    // el histórico de nómina y auditoría (una liquidación necesita seguir viendo sus datos).
    @Column(name = "fecha_egreso")
    private LocalDate fechaEgreso;

    // Opcional — ver el comentario de clase. Sin FK física a Usuario (igual criterio que
    // MovimientoCaja.referenciaId): evita un acoplamiento fuerte entre dos módulos que pueden
    // evolucionar por separado, y permite borrar/reasignar credenciales sin afectar el empleado.
    @Column(name = "usuario_id")
    private Long usuarioId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombreCompleto() { return nombreCompleto; }
    public void setNombreCompleto(String nombreCompleto) { this.nombreCompleto = nombreCompleto; }
    public String getDocumentoIdentidad() { return documentoIdentidad; }
    public void setDocumentoIdentidad(String documentoIdentidad) { this.documentoIdentidad = documentoIdentidad; }
    public LocalDate getFechaIngreso() { return fechaIngreso; }
    public void setFechaIngreso(LocalDate fechaIngreso) { this.fechaIngreso = fechaIngreso; }
    public LocalDate getFechaEgreso() { return fechaEgreso; }
    public void setFechaEgreso(LocalDate fechaEgreso) { this.fechaEgreso = fechaEgreso; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }

    @Transient
    public boolean isActivo() { return fechaEgreso == null; }
}
