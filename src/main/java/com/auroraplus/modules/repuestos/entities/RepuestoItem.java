package com.auroraplus.modules.repuestos.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

/**
 * Ítem de catálogo de repuestos, optimizado para volúmenes masivos (>20,000
 * registros por tenant): los índices sobre codigoSku y codigoOriginalOem
 * (además del compuesto con tenant_id) son los que sostienen la velocidad de
 * búsqueda a ese volumen — sin ellos cada lookup degradaría a full scan.
 */
@Entity
@Table(name = "repuestos_items", indexes = {
    @Index(name = "idx_repuesto_tenant_sku", columnList = "tenant_id, codigo_sku"),
    @Index(name = "idx_repuesto_tenant_oem", columnList = "tenant_id, codigo_original_oem")
})
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class RepuestoItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "codigo_sku", nullable = false, length = 50)
    private String codigoSku;

    @Column(name = "codigo_original_oem", length = 50)
    private String codigoOriginalOem;

    @Column(nullable = false)
    private String descripcion;

    @Column(name = "stock_actual", nullable = false, precision = 18, scale = 4)
    private BigDecimal stockActual = BigDecimal.ZERO;

    @Column(name = "precio_venta", nullable = false, precision = 18, scale = 2)
    private BigDecimal precioVenta; // Precio Detal (por defecto, para ventas por debajo del umbral mayorista)

    @Column(name = "unidad_base", nullable = false, length = 20)
    private String unidadBase = "UNIDAD"; // Unidad en la que se lleva stockActual: UNIDAD, METRO, KILOGRAMO, etc.

    // Subfase 5.3 — Listas de Precios y Volumen: si se configuran ambos campos,
    // una venta con cantidad >= cantidadMinimaMayorista cobra precioMayorista
    // en vez de precioVenta (Detal), automáticamente.
    @Column(name = "precio_mayorista", precision = 18, scale = 2)
    private BigDecimal precioMayorista;

    @Column(name = "cantidad_minima_mayorista", precision = 18, scale = 4)
    private BigDecimal cantidadMinimaMayorista;

    // Costo de la última compra registrada (se actualiza automáticamente al
    // registrar una CompraRepuesto). Sirve para calcular margen real.
    @Column(name = "costo_unitario", precision = 18, scale = 2)
    private BigDecimal costoUnitario = BigDecimal.ZERO;

    // Smart Restocking: umbral por debajo del cual una venta dispara un borrador
    // de orden de compra automático (ver OrdenCompraSugeridaService). Antes no
    // existía en el backend — el frontend usaba un "5" fijo solo de adorno.
    @Column(name = "stock_minimo", nullable = false, precision = 18, scale = 4)
    private BigDecimal stockMinimo = new BigDecimal("5");

    // Proveedor al que se le arma el borrador de reposición automática de este
    // ítem. Se guarda solo el id (no una relación @ManyToOne) para no acoplar
    // la lectura del catálogo completo a un join adicional en cada listado.
    @Column(name = "proveedor_principal_id")
    private Long proveedorPrincipalId;

    // Categoría real, editable por el dueño (ej. "Celulares", "Perfumes", "Zapatos",
    // "Ferretería") — antes no existía este campo: el catálogo público inventaba una
    // categoría genérica ("Repuestos & Ferretería"/"General") a partir de si el ítem
    // tenía código OEM o no, sin que el dueño pudiera organizarlo de verdad. Null =
    // "Sin categoría" en el catálogo público.
    @Column(length = 60)
    private String categoria;

    // Descripción larga para el catálogo público — distinta de `descripcion` (arriba),
    // que en realidad funciona como el NOMBRE corto del producto ("Martillo de Uña
    // 16oz"), no como una descripción de venta. Sin este campo no había dónde contarle
    // al cliente final detalles reales del producto (material, garantía, variantes).
    @Column(name = "descripcion_larga", columnDefinition = "TEXT")
    private String descripcionLarga;

    // Foto del producto, codificada en Base64 — mismo patrón que
    // LicenciaTenant.logoBase64 (sin infraestructura de almacenamiento de archivos en
    // el proyecto todavía). Null = el catálogo público muestra un ícono de reemplazo.
    @Column(name = "imagen_base64", columnDefinition = "TEXT")
    private String imagenBase64;

    // Agrupación de variantes para el catálogo público (ej. mismo zapato en varias
    // tallas) — el INVENTARIO sigue siendo un RepuestoItem independiente por talla/color,
    // con su propio stock; esto solo le dice al catálogo público "estos SKU son el mismo
    // producto, muéstralos juntos con un selector". Null = sin variantes, se muestra
    // como tarjeta individual (comportamiento de siempre). Ver
    // CatalogoPublicoController.obtenerCatalogoPublico.
    @Column(name = "grupo_variante", length = 80)
    private String grupoVariante;

    // Etiqueta de ESTE SKU dentro de su grupoVariante (ej. "Talla 38", "Modelo X").
    // Sin efecto si grupoVariante es null.
    @Column(name = "atributo_variante", length = 40)
    private String atributoVariante;

    // Segunda faceta de variante (ej. "Rojo", "Azul") — separada de atributoVariante
    // para poder armar un selector de dos pasos en el catálogo público (color, luego
    // talla), igual que cualquier tienda de ropa/calzado real. Null = sin color propio.
    @Column(name = "color_variante", length = 40)
    private String colorVariante;

    // Oculta el producto del catálogo público sin borrarlo (ej. descontinuado,
    // fuera de temporada) — el inventario y las ventas de mostrador lo siguen viendo
    // normal, solo el catálogo público lo filtra. Wrapper (no boolean primitivo) A
    // PROPÓSITO: esta misma clase se reutiliza como cuerpo del PUT de edición parcial
    // (ver RepuestoItemController.actualizar) — con un primitivo, un PUT que no manda
    // "visible" lo resetearía a su default de Java (false) o al del inicializador
    // (true) en cada edición, pisando lo que el dueño haya configurado antes. null =
    // "no tocar este campo" en un PUT; se resuelve a true solo al CREAR (ver crear()).
    @Column(nullable = false)
    private Boolean visible;

    // Orden manual de aparición en el catálogo público (menor = primero). Empate se
    // desempata por descripción. Simple a propósito (un número, no drag-and-drop) —
    // el dueño sube o baja el número del producto que quiere destacar primero. Wrapper
    // por la misma razón que `visible` arriba.
    @Column(name = "orden_visualizacion", nullable = false)
    private Integer ordenVisualizacion;

    // Fecha de caducidad del artículo (ej. pinturas, adhesivos, productos químicos
    // de ferretería con vida útil) — un solo dato por SKU, no por lote, a propósito:
    // este módulo no lleva lotes/kárdex FEFO como el especializado de Farmacia
    // (ver ModalNuevoProducto en el frontend), solo una alerta simple de "se acerca
    // a vencer" sobre el stock que ya existe. Null = no aplica a este artículo.
    @Column(name = "fecha_vencimiento")
    private LocalDate fechaVencimiento;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getCodigoSku() { return codigoSku; }
    public void setCodigoSku(String codigoSku) { this.codigoSku = codigoSku; }
    public String getCodigoOriginalOem() { return codigoOriginalOem; }
    public void setCodigoOriginalOem(String codigoOriginalOem) { this.codigoOriginalOem = codigoOriginalOem; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public BigDecimal getStockActual() { return stockActual; }
    public void setStockActual(BigDecimal stockActual) { this.stockActual = stockActual; }
    public BigDecimal getPrecioVenta() { return precioVenta; }
    public void setPrecioVenta(BigDecimal precioVenta) { this.precioVenta = precioVenta; }
    public String getUnidadBase() { return unidadBase; }
    public void setUnidadBase(String unidadBase) { this.unidadBase = unidadBase; }
    public BigDecimal getPrecioMayorista() { return precioMayorista; }
    public void setPrecioMayorista(BigDecimal precioMayorista) { this.precioMayorista = precioMayorista; }
    public BigDecimal getCantidadMinimaMayorista() { return cantidadMinimaMayorista; }
    public void setCantidadMinimaMayorista(BigDecimal cantidadMinimaMayorista) { this.cantidadMinimaMayorista = cantidadMinimaMayorista; }
    public BigDecimal getCostoUnitario() { return costoUnitario; }
    public void setCostoUnitario(BigDecimal costoUnitario) { this.costoUnitario = costoUnitario; }
    public BigDecimal getStockMinimo() { return stockMinimo; }
    public void setStockMinimo(BigDecimal stockMinimo) { this.stockMinimo = stockMinimo; }
    public Long getProveedorPrincipalId() { return proveedorPrincipalId; }
    public void setProveedorPrincipalId(Long proveedorPrincipalId) { this.proveedorPrincipalId = proveedorPrincipalId; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public String getDescripcionLarga() { return descripcionLarga; }
    public void setDescripcionLarga(String descripcionLarga) { this.descripcionLarga = descripcionLarga; }
    public String getImagenBase64() { return imagenBase64; }
    public void setImagenBase64(String imagenBase64) { this.imagenBase64 = imagenBase64; }
    public String getGrupoVariante() { return grupoVariante; }
    public void setGrupoVariante(String grupoVariante) { this.grupoVariante = grupoVariante; }
    public String getAtributoVariante() { return atributoVariante; }
    public void setAtributoVariante(String atributoVariante) { this.atributoVariante = atributoVariante; }
    public String getColorVariante() { return colorVariante; }
    public void setColorVariante(String colorVariante) { this.colorVariante = colorVariante; }
    public Boolean getVisible() { return visible; }
    public void setVisible(Boolean visible) { this.visible = visible; }
    public Integer getOrdenVisualizacion() { return ordenVisualizacion; }
    public void setOrdenVisualizacion(Integer ordenVisualizacion) { this.ordenVisualizacion = ordenVisualizacion; }
    public LocalDate getFechaVencimiento() { return fechaVencimiento; }
    public void setFechaVencimiento(LocalDate fechaVencimiento) { this.fechaVencimiento = fechaVencimiento; }

    // ── Utilidad calculada (no persistida): se recalcula sola en cada
    // lectura a partir de precio y costo actuales, para que el usuario vea
    // de una vez cuánto gana con este producto al registrar/editar precios.
    @Transient
    public BigDecimal getUtilidadDetalUnitaria() {
        if (precioVenta == null || costoUnitario == null) return null;
        return precioVenta.subtract(costoUnitario);
    }

    @Transient
    public BigDecimal getUtilidadDetalPorcentual() {
        BigDecimal utilidad = getUtilidadDetalUnitaria();
        if (utilidad == null || costoUnitario == null || costoUnitario.compareTo(BigDecimal.ZERO) == 0) return null;
        return utilidad.divide(costoUnitario, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
    }

    @Transient
    public BigDecimal getUtilidadMayoristaUnitaria() {
        if (precioMayorista == null || costoUnitario == null) return null;
        return precioMayorista.subtract(costoUnitario);
    }

    @Transient
    public BigDecimal getUtilidadMayoristaPorcentual() {
        BigDecimal utilidad = getUtilidadMayoristaUnitaria();
        if (utilidad == null || costoUnitario == null || costoUnitario.compareTo(BigDecimal.ZERO) == 0) return null;
        return utilidad.divide(costoUnitario, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
    }

    // Red de seguridad para cualquier punto de creación que no haya llamado
    // setVisible/setOrdenVisualizacion explícitamente (tests, importación masiva,
    // futuros call-sites) — sin esto, un INSERT con estos campos en null viola la
    // restricción NOT NULL de la columna. Nunca pisa un valor ya elegido: solo
    // corre en la inserción, nunca en un UPDATE.
    @PrePersist
    private void aplicarDefaultsAlCrear() {
        if (visible == null) visible = true;
        if (ordenVisualizacion == null) ordenVisualizacion = 0;
    }
}
