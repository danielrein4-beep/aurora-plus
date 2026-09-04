package com.auroraplus.core.config.entities;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "licencias_tenant")
public class LicenciaTenant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_licencia", nullable = false, length = 20)
    private TipoLicencia tipoLicencia;

    @Column(nullable = false)
    private boolean activa;

    @Column(name = "fecha_vencimiento_pago", nullable = false)
    private LocalDate fechaVencimientoPago;

    @Column(name = "nombre_empresa", nullable = false)
    private String nombreEmpresa;

    // Vertical al que pertenece este cliente (minero, horeca, repuestos, moda,
    // tamanaco-comercial, ganaderia...) — el mismo valor que espera
    // LicenciaService.NIVEL_REQUERIDO_POR_MODULO. Con esto el sistema sabe a
    // qué módulo mandar al tenant directo al entrar, sin que tenga que
    // navegar un menú genérico con verticales que no le aplican.
    @Column(name = "modulo_principal", nullable = false, length = 40)
    private String moduloPrincipal;

    private String emailContacto;
    private String telefonoContacto;

    // Moneda en la que este negocio opera y reporta (USD, VES, COP...). Todos
    // los pagos que lleguen en otra moneda se convierten a esta usando la
    // tasa vigente (ver core.financiero.TasaCambio) antes de registrarse en caja.
    @Column(name = "moneda_base", nullable = false, length = 3)
    private String monedaBase = "USD";

    @Column(name = "fecha_alta", nullable = false)
    private LocalDate fechaAlta = LocalDate.now();

    public enum TipoLicencia { BASICA, COMERCIAL, INDUSTRIAL }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public TipoLicencia getTipoLicencia() { return tipoLicencia; }
    public void setTipoLicencia(TipoLicencia tipoLicencia) { this.tipoLicencia = tipoLicencia; }
    public boolean isActiva() { return activa; }
    public void setActiva(boolean activa) { this.activa = activa; }
    public LocalDate getFechaVencimientoPago() { return fechaVencimientoPago; }
    public void setFechaVencimientoPago(LocalDate fechaVencimientoPago) { this.fechaVencimientoPago = fechaVencimientoPago; }
    public String getNombreEmpresa() { return nombreEmpresa; }
    public void setNombreEmpresa(String nombreEmpresa) { this.nombreEmpresa = nombreEmpresa; }
    public String getModuloPrincipal() { return moduloPrincipal; }
    public void setModuloPrincipal(String moduloPrincipal) { this.moduloPrincipal = moduloPrincipal; }
    public String getEmailContacto() { return emailContacto; }
    public void setEmailContacto(String emailContacto) { this.emailContacto = emailContacto; }
    public String getTelefonoContacto() { return telefonoContacto; }
    public void setTelefonoContacto(String telefonoContacto) { this.telefonoContacto = telefonoContacto; }
    public LocalDate getFechaAlta() { return fechaAlta; }
    public void setFechaAlta(LocalDate fechaAlta) { this.fechaAlta = fechaAlta; }
    public String getMonedaBase() { return monedaBase; }
    public void setMonedaBase(String monedaBase) { this.monedaBase = monedaBase; }
}
