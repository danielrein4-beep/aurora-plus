package com.auroraplus.core.config.entities;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * Registro de licenciamiento por módulo: un tenant puede tener VARIOS módulos
 * de industria contratados a la vez (ej. minería + salud), a diferencia del
 * viejo LicenciaTenant.moduloPrincipal que solo permitía uno. Esta tabla es la
 * fuente de verdad de qué verticales están habilitadas para cada cliente —
 * LicenciaInterceptor consulta esto en cada request antes de dejar pasar al
 * controlador (ver LicenciaService.validarAcceso).
 */
@Entity
@Table(name = "modulos_tenant", uniqueConstraints = @UniqueConstraint(columnNames = {"tenant_id", "modulo_nombre"}))
public class ModuloTenant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    // Nombre del módulo tal como aparece en la URL (ej: "minero", "horeca",
    // "salud", "repuestos") — el mismo valor que LicenciaInterceptor extrae
    // de /api/{modulo}/...
    @Column(name = "modulo_nombre", nullable = false, length = 40)
    private String moduloNombre;

    @Column(name = "is_active", nullable = false)
    private boolean activo = true;

    @Column(name = "fecha_activacion", nullable = false)
    private LocalDate fechaActivacion = LocalDate.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getModuloNombre() { return moduloNombre; }
    public void setModuloNombre(String moduloNombre) { this.moduloNombre = moduloNombre; }
    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }
    public LocalDate getFechaActivacion() { return fechaActivacion; }
    public void setFechaActivacion(LocalDate fechaActivacion) { this.fechaActivacion = fechaActivacion; }
}
