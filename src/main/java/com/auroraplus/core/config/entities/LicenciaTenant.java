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

    // Qué serie de tasa USD/VES gobierna el cobro en el POS de este negocio: BCV (oficial,
    // se refresca de bcv.org.ve vía dolarapi.com), USDT (P2P, se refresca de Binance) o
    // PERSONALIZADA (la única que el negocio escribe a mano). BCV y USDT NO son editables
    // por el negocio — es una decisión de negocio (Dueño/Administrador), por eso vive acá y
    // no en localStorage del navegador, que se desincroniza entre terminales/dispositivos.
    @Column(name = "origen_tasa_activa", nullable = false, length = 20)
    private String origenTasaActiva = "USDT";

    @Column(name = "fecha_alta", nullable = false)
    private LocalDate fechaAlta = LocalDate.now();

    // Logo del negocio (imagen codificada en Base64) — para membretar recibos, PDFs y fichas.
    @Column(name = "logo_base64", columnDefinition = "TEXT")
    private String logoBase64;

    // Add-on administrado por Aurora: solo un super-admin puede habilitarlo.
    @Column(name = "personalizacion_tienda_activa", nullable = false)
    private boolean personalizacionTiendaActiva = false;

    @Column(name = "color_acento_tienda", length = 7)
    private String colorAcentoTienda;

    @Column(name = "banner_base64", columnDefinition = "TEXT")
    private String bannerBase64;

    // Hierro/marca de propiedad del ganado (imagen codificada en Base64) — específico de
    // Ganadería, se estampa en la ficha de identificación del animal (ver AnimalQrService).
    @Column(name = "hierro_base64", columnDefinition = "TEXT")
    private String hierroBase64;

    // Datos fiscales OPCIONALES del negocio — se estampan en las notas de entrega/recibos
    // (ver VentaAnimalPdfService, DespachoLechePdfService) cuando el dueño los llena; si
    // quedan vacíos, el documento se genera igual, solo sin esa línea (nunca se bloquea
    // la operación por falta de RIF, ya que muchos ganaderos operan sin registro fiscal formal).
    private String rif;
    @Column(name = "razon_social")
    private String razonSocial;
    @Column(name = "domicilio_fiscal", columnDefinition = "TEXT")
    private String domicilioFiscal;

    // Estaciones de cocina de Horeca (ej. "COCINA,PARRILLA,BAR") — antes venían
    // fijas (COCINA/PARRILLA/BAR/COCINA_FRIA) en el frontend, pero no todos los
    // negocios tienen esas 4 zonas exactas. Null = usa las 4 por defecto.
    // Lista separada por comas en vez de una tabla aparte: es solo una lista de
    // nombres de texto por tenant, sin datos ni relaciones propias.
    @Column(name = "zonas_cocina", columnDefinition = "TEXT")
    private String zonasCocina;

    // Zonas físicas de mesas de Horeca (ej. "SALON_PRINCIPAL,TERRAZA,BARRA") — antes venían
    // fijas a esas 3 exactas en el frontend. Mismo criterio que zonasCocina: lista de texto
    // separada por comas, null = usa las 3 por defecto.
    @Column(name = "zonas_mesa", columnDefinition = "TEXT")
    private String zonasMesa;

    // Binance Pay del NEGOCIO (no de Aurora Plus) — cada tenant cobra a SU
    // PROPIA cuenta Binance Merchant, nunca a la de Aurora. El API Key no es
    // secreto (viaja en cada request a Binance igual), pero el Secret Key sí
    // — se guarda cifrado (ver CifradoSimetricoService), nunca en texto
    // plano, y nunca se devuelve completo al frontend una vez guardado.
    @Column(name = "binance_pay_api_key")
    private String binancePayApiKey;

    @Column(name = "binance_pay_secret_key_cifrado", columnDefinition = "TEXT")
    private String binancePaySecretKeyCifrado;

    @Column(name = "binance_pay_activo", nullable = false)
    private boolean binancePayActivo = false;

    @Column(name = "pago_movil_banco", length = 100)
    private String pagoMovilBanco;

    @Column(name = "pago_movil_telefono", length = 50)
    private String pagoMovilTelefono;

    @Column(name = "pago_movil_documento", length = 50)
    private String pagoMovilDocumento;

    @Column(name = "pago_movil_titular", length = 150)
    private String pagoMovilTitular;

    @Column(name = "pago_movil_activo", nullable = false)
    private boolean pagoMovilActivo = true;

    @Column(name = "whatsapp_ia_activa", nullable = false)
    private boolean whatsappIaActiva = true;

    @Column(name = "whatsapp_ia_saludo", length = 255)
    private String whatsappIaSaludo;

    @Column(name = "whatsapp_ia_zonas_delivery", columnDefinition = "TEXT")
    private String whatsappIaZonasDelivery;

    @Column(name = "whatsapp_ia_politica_delivery", columnDefinition = "TEXT")
    private String whatsappIaPoliticaDelivery;

    @Column(name = "whatsapp_webhook_verify_token", length = 100)
    private String whatsappWebhookVerifyToken;

    @Column(name = "slug_catalogo", unique = true, length = 100)
    private String slugCatalogo;

    // Costo fijo que se suma al total del carrito en el catálogo público cuando
    // el cliente elige "Delivery" (0 = gratis, el comportamiento de antes de
    // que este campo existiera). No hay tarifa por distancia — solo un monto
    // fijo configurable por el dueño de la tienda.
    @Column(name = "costo_envio_delivery", nullable = false, precision = 18, scale = 2)
    private java.math.BigDecimal costoEnvioDelivery = java.math.BigDecimal.ZERO;

    // WhatsApp Business Cloud API (Meta) del NEGOCIO — cada tenant conecta SU
    // PROPIA cuenta de Meta para automatizar el recordatorio de citas por
    // WhatsApp (antes solo un link wa.me que la secretaria mandaba a mano).
    // El phoneNumberId no es secreto, pero el access token sí — se guarda
    // cifrado (ver CifradoSimetricoService). La plantilla debe estar
    // previamente aprobada por Meta: WhatsApp no permite que un negocio le
    // escriba primero a un número con texto libre, solo con una plantilla
    // ya revisada — por eso el nombre de plantilla es configurable y no fijo.
    @Column(name = "whatsapp_phone_number_id")
    private String whatsappPhoneNumberId;

    @Column(name = "whatsapp_access_token_cifrado", columnDefinition = "TEXT")
    private String whatsappAccessTokenCifrado;

    @Column(name = "whatsapp_plantilla_nombre")
    private String whatsappPlantillaNombre;

    @Column(name = "whatsapp_activo", nullable = false)
    private boolean whatsappActivo = false;

    // Auditoría antifraude en Cierre Z: si |descuadre| supera este margen, el
    // cierre igual se procesa (no bloquea al cajero) pero queda una
    // AlertaAdmin silenciosa para el dueño (ver TesoreriaService). Cada
    // negocio tolera un margen distinto según su volumen de caja diario.
    @Column(name = "margen_tolerancia_descuadre", nullable = false, precision = 18, scale = 2)
    private BigDecimal margenToleranciaDescuadre = new BigDecimal("2.00");

    @Column(name = "limite_usuarios")
    private Integer limiteUsuarios;

    @Transient
    private Long cantidadUsuarios;

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
    public String getOrigenTasaActiva() { return origenTasaActiva; }
    public void setOrigenTasaActiva(String origenTasaActiva) { this.origenTasaActiva = origenTasaActiva; }
    public String getLogoBase64() { return logoBase64; }
    public void setLogoBase64(String logoBase64) { this.logoBase64 = logoBase64; }
    public boolean isPersonalizacionTiendaActiva() { return personalizacionTiendaActiva; }
    public void setPersonalizacionTiendaActiva(boolean personalizacionTiendaActiva) { this.personalizacionTiendaActiva = personalizacionTiendaActiva; }
    public String getColorAcentoTienda() { return colorAcentoTienda; }
    public void setColorAcentoTienda(String colorAcentoTienda) { this.colorAcentoTienda = colorAcentoTienda; }
    public String getBannerBase64() { return bannerBase64; }
    public void setBannerBase64(String bannerBase64) { this.bannerBase64 = bannerBase64; }
    public String getHierroBase64() { return hierroBase64; }
    public void setHierroBase64(String hierroBase64) { this.hierroBase64 = hierroBase64; }
    public String getRif() { return rif; }
    public void setRif(String rif) { this.rif = rif; }
    public String getRazonSocial() { return razonSocial; }
    public void setRazonSocial(String razonSocial) { this.razonSocial = razonSocial; }
    public String getDomicilioFiscal() { return domicilioFiscal; }
    public void setDomicilioFiscal(String domicilioFiscal) { this.domicilioFiscal = domicilioFiscal; }
    public String getZonasCocina() { return zonasCocina; }
    public void setZonasCocina(String zonasCocina) { this.zonasCocina = zonasCocina; }
    public String getZonasMesa() { return zonasMesa; }
    public void setZonasMesa(String zonasMesa) { this.zonasMesa = zonasMesa; }
    public String getBinancePayApiKey() { return binancePayApiKey; }
    public void setBinancePayApiKey(String binancePayApiKey) { this.binancePayApiKey = binancePayApiKey; }
    public String getBinancePaySecretKeyCifrado() { return binancePaySecretKeyCifrado; }
    public void setBinancePaySecretKeyCifrado(String binancePaySecretKeyCifrado) { this.binancePaySecretKeyCifrado = binancePaySecretKeyCifrado; }
    public boolean isBinancePayActivo() { return binancePayActivo; }
    public void setBinancePayActivo(boolean binancePayActivo) { this.binancePayActivo = binancePayActivo; }
    public String getWhatsappPhoneNumberId() { return whatsappPhoneNumberId; }
    public void setWhatsappPhoneNumberId(String whatsappPhoneNumberId) { this.whatsappPhoneNumberId = whatsappPhoneNumberId; }
    public String getWhatsappAccessTokenCifrado() { return whatsappAccessTokenCifrado; }
    public void setWhatsappAccessTokenCifrado(String whatsappAccessTokenCifrado) { this.whatsappAccessTokenCifrado = whatsappAccessTokenCifrado; }
    public String getWhatsappPlantillaNombre() { return whatsappPlantillaNombre; }
    public void setWhatsappPlantillaNombre(String whatsappPlantillaNombre) { this.whatsappPlantillaNombre = whatsappPlantillaNombre; }
    public boolean isWhatsappActivo() { return whatsappActivo; }
    public void setWhatsappActivo(boolean whatsappActivo) { this.whatsappActivo = whatsappActivo; }
    public BigDecimal getMargenToleranciaDescuadre() { return margenToleranciaDescuadre; }
    public void setMargenToleranciaDescuadre(BigDecimal margenToleranciaDescuadre) { this.margenToleranciaDescuadre = margenToleranciaDescuadre; }
    public Integer getLimiteUsuarios() { return limiteUsuarios; }
    public void setLimiteUsuarios(Integer limiteUsuarios) { this.limiteUsuarios = limiteUsuarios; }
    public Long getCantidadUsuarios() { return cantidadUsuarios; }
    public void setCantidadUsuarios(Long cantidadUsuarios) { this.cantidadUsuarios = cantidadUsuarios; }

    public String getPagoMovilBanco() { return pagoMovilBanco; }
    public void setPagoMovilBanco(String pagoMovilBanco) { this.pagoMovilBanco = pagoMovilBanco; }
    public String getPagoMovilTelefono() { return pagoMovilTelefono; }
    public void setPagoMovilTelefono(String pagoMovilTelefono) { this.pagoMovilTelefono = pagoMovilTelefono; }
    public String getPagoMovilDocumento() { return pagoMovilDocumento; }
    public void setPagoMovilDocumento(String pagoMovilDocumento) { this.pagoMovilDocumento = pagoMovilDocumento; }
    public String getPagoMovilTitular() { return pagoMovilTitular; }
    public void setPagoMovilTitular(String pagoMovilTitular) { this.pagoMovilTitular = pagoMovilTitular; }
    public boolean isPagoMovilActivo() { return pagoMovilActivo; }
    public void setPagoMovilActivo(boolean pagoMovilActivo) { this.pagoMovilActivo = pagoMovilActivo; }

    public boolean isWhatsappIaActiva() { return whatsappIaActiva; }
    public void setWhatsappIaActiva(boolean whatsappIaActiva) { this.whatsappIaActiva = whatsappIaActiva; }
    public String getWhatsappIaSaludo() { return whatsappIaSaludo; }
    public void setWhatsappIaSaludo(String whatsappIaSaludo) { this.whatsappIaSaludo = whatsappIaSaludo; }
    public String getWhatsappIaZonasDelivery() { return whatsappIaZonasDelivery; }
    public void setWhatsappIaZonasDelivery(String whatsappIaZonasDelivery) { this.whatsappIaZonasDelivery = whatsappIaZonasDelivery; }
    public String getWhatsappIaPoliticaDelivery() { return whatsappIaPoliticaDelivery; }
    public void setWhatsappIaPoliticaDelivery(String whatsappIaPoliticaDelivery) { this.whatsappIaPoliticaDelivery = whatsappIaPoliticaDelivery; }
    public String getWhatsappWebhookVerifyToken() { return whatsappWebhookVerifyToken; }
    public void setWhatsappWebhookVerifyToken(String whatsappWebhookVerifyToken) { this.whatsappWebhookVerifyToken = whatsappWebhookVerifyToken; }

    public String getSlugCatalogo() { return slugCatalogo; }
    public void setSlugCatalogo(String slugCatalogo) { this.slugCatalogo = slugCatalogo; }
    public java.math.BigDecimal getCostoEnvioDelivery() { return costoEnvioDelivery; }
    public void setCostoEnvioDelivery(java.math.BigDecimal costoEnvioDelivery) { this.costoEnvioDelivery = costoEnvioDelivery; }
}
