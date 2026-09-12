package com.auroraplus.core.config.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

// UNIQUE en tenant_id (ver migración V2__...sql) — candado de base de datos
// contra la condición de carrera ya corregida en TenantProvisioningService,
// donde dos altas de negocio simultáneas podían terminar con el mismo
// tenant_id calculado por MAX()+1 sin serializar.
@Entity
@Table(name = "licencias_tenant", uniqueConstraints = @UniqueConstraint(columnNames = "tenant_id"))
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

    // Logo del negocio (imagen codificada en Base64) — para membretar recibos, PDFs y fichas.
    @Column(name = "logo_base64", columnDefinition = "TEXT")
    private String logoBase64;

    // Hierro/marca de propiedad del ganado (imagen codificada en Base64) — específico de
    // Ganadería, se estampa en la ficha de identificación del animal (ver AnimalQrService).
    @Column(name = "hierro_base64", columnDefinition = "TEXT")
    private String hierroBase64;

    // Auditoría antifraude en Cierre Z: si |descuadre| supera este margen, el
    // cierre igual se procesa (no bloquea al cajero) pero queda una
    // AlertaAdmin silenciosa para el dueño (ver TesoreriaService). Cada
    // negocio tolera un margen distinto según su volumen de caja diario.
    @Column(name = "margen_tolerancia_descuadre", nullable = false, precision = 18, scale = 2)
    private BigDecimal margenToleranciaDescuadre = new BigDecimal("2.00");

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
    public String getLogoBase64() { return logoBase64; }
    public void setLogoBase64(String logoBase64) { this.logoBase64 = logoBase64; }
    public String getHierroBase64() { return hierroBase64; }
    public void setHierroBase64(String hierroBase64) { this.hierroBase64 = hierroBase64; }
    public BigDecimal getMargenToleranciaDescuadre() { return margenToleranciaDescuadre; }
    public void setMargenToleranciaDescuadre(BigDecimal margenToleranciaDescuadre) { this.margenToleranciaDescuadre = margenToleranciaDescuadre; }
}
