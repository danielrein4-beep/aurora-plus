package com.auroraplus.core.inventario.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

@Entity
@Table(name = "articulos")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Articulo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false, length = 50)
    private String sku;

    @Column(nullable = false)
    private String nombre;

    @Column(name = "unidad_medida", nullable = false, length = 20)
    private String unidadMedida;

    @Column(nullable = false)
    private String categoria;

    @Column(name = "porcentaje_impuesto", nullable = false, precision = 5, scale = 2)
    private BigDecimal porcentajeImpuesto;

    @Column(name = "stock_actual", nullable = false, precision = 18, scale = 4)
    private BigDecimal stockActual = BigDecimal.ZERO;

    // Escala 4 (no 2): el costeo por gramos/ml (Horeca) trabaja con fracciones de
    // centavo por unidad (ej. $0.012/gramo en carne comprada a granel) — con solo
    // 2 decimales, ese costo se redondeaba a $0.01 y el escandallo quedaba mal
    // calculado en cualquier ingrediente barato comprado en bulto.
    @Column(name = "costo_unitario", nullable = false, precision = 18, scale = 4)
    private BigDecimal costoUnitario = BigDecimal.ZERO;

    // Precio al que se vende (distinto del costo) — columnDefinition con default
    // porque la tabla ya tiene filas: sin esto, Hibernate falla en silencio al
    // agregar una columna NOT NULL a una tabla no vacía (ddl-auto=update).
    @Column(name = "precio_venta", nullable = false, precision = 18, scale = 4, columnDefinition = "numeric(18,4) default 0")
    private BigDecimal precioVenta = BigDecimal.ZERO;

    // Umbral para alertas de reposición — null significa "sin alerta configurada".
    @Column(name = "stock_minimo", precision = 18, scale = 4)
    private BigDecimal stockMinimo;

    // costoUnitario arriba SIEMPRE está en la moneda base del tenant
    // (LicenciaTenant.monedaBase — configurable por el Dueño/Administrador en
    // Configuración, USD por defecto; así lo usan margen, kardex y el catálogo
    // del POS) — pero un negocio puede haber comprado este artículo pagando en
    // otra moneda. Estos dos campos guardan el monto y la moneda TAL COMO se
    // compró, solo para mostrar en Inventario "lo compré en 4500 COP" en vez
    // de forzar todo a la moneda base — no participan en ningún cálculo
    // financiero, son de visualización.
    @Column(name = "moneda_costo", length = 10, columnDefinition = "varchar(10) default 'USD'")
    private String monedaCosto = "USD";

    @Column(name = "costo_unitario_original", precision = 18, scale = 4)
    private BigDecimal costoUnitarioOriginal;

    // Campos de Aurora Retail (Ferretería/Farmacia/Repuestos) — opcionales,
    // ausentes/null para artículos de HORECA u otros módulos que no los usan.
    // Un solo Articulo del core sirve a todas las verticales; cada capa solo
    // lee/pinta el campo que le corresponde.
    @Column(name = "codigo_barras", length = 64)
    private String codigoBarras;

    // Solo relevante para Farmacia — permite al cajero ofrecer un genérico
    // por principio activo si no hay stock de la marca buscada.
    @Column(name = "principio_activo", length = 120)
    private String principioActivo;

    // Bloqueo optimista: sin esto, dos ventas simultáneas del mismo artículo
    // (ej. la última unidad, vendida desde dos cajas a la vez) leen el mismo
    // stockActual antes de que la otra confirme, y ambas descuentan como si
    // hubiera stock suficiente — el stock termina en negativo. Con @Version,
    // la segunda transacción que intenta guardar falla con un error claro en
    // vez de corromper el stock en silencio (ver GlobalExceptionHandler).
    @Version
    @Column(name = "version", nullable = false, columnDefinition = "bigint default 0")
    private Long version = 0L;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getUnidadMedida() { return unidadMedida; }
    public void setUnidadMedida(String unidadMedida) { this.unidadMedida = unidadMedida; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public BigDecimal getPorcentajeImpuesto() { return porcentajeImpuesto; }
    public void setPorcentajeImpuesto(BigDecimal porcentajeImpuesto) { this.porcentajeImpuesto = porcentajeImpuesto; }
    public BigDecimal getStockActual() { return stockActual; }
    public void setStockActual(BigDecimal stockActual) { this.stockActual = stockActual; }
    public BigDecimal getCostoUnitario() { return costoUnitario; }
    public void setCostoUnitario(BigDecimal costoUnitario) { this.costoUnitario = costoUnitario; }
    public BigDecimal getPrecioVenta() { return precioVenta; }
    public void setPrecioVenta(BigDecimal precioVenta) { this.precioVenta = precioVenta; }
    public BigDecimal getStockMinimo() { return stockMinimo; }
    public void setStockMinimo(BigDecimal stockMinimo) { this.stockMinimo = stockMinimo; }
    public String getMonedaCosto() { return monedaCosto; }
    public void setMonedaCosto(String monedaCosto) { this.monedaCosto = monedaCosto; }
    public BigDecimal getCostoUnitarioOriginal() { return costoUnitarioOriginal; }
    public void setCostoUnitarioOriginal(BigDecimal costoUnitarioOriginal) { this.costoUnitarioOriginal = costoUnitarioOriginal; }
    public String getCodigoBarras() { return codigoBarras; }
    public void setCodigoBarras(String codigoBarras) { this.codigoBarras = codigoBarras; }
    public String getPrincipioActivo() { return principioActivo; }
    public void setPrincipioActivo(String principioActivo) { this.principioActivo = principioActivo; }

    /** Valor en inventario en la moneda en que se compró (para mostrar) — costoUnitarioOriginal * stockActual; cae a costoUnitario (USD) si el artículo no tiene el original registrado (altas viejas). */
    @Transient
    public BigDecimal getValorInventarioOriginal() {
        BigDecimal costo = costoUnitarioOriginal != null ? costoUnitarioOriginal : costoUnitario;
        return costo.multiply(stockActual);
    }

    @Transient
    public boolean isStockBajoMinimo() {
        return stockMinimo != null && stockActual.compareTo(stockMinimo) < 0;
    }

    /** Margen de utilidad bruta % = (precio - costo) / precio * 100 — null si no hay precio de venta cargado. */
    @Transient
    public BigDecimal getMargenUtilidad() {
        if (precioVenta == null || precioVenta.compareTo(BigDecimal.ZERO) <= 0) return null;
        BigDecimal costo = costoUnitario != null ? costoUnitario : BigDecimal.ZERO;
        return precioVenta.subtract(costo).divide(precioVenta, 4, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
    }
}
