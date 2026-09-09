package com.auroraplus.core.inventario.repositories;

import com.auroraplus.core.inventario.entities.Articulo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface ArticuloRepository extends JpaRepository<Articulo, Long> {

    Optional<Articulo> findBySkuAndTenantId(String sku, Long tenantId);

    List<Articulo> findByTenantId(Long tenantId);

    // Lectura de scanner en el POS de Aurora Retail — un código de barras es
    // único dentro de un tenant (no globalmente: dos negocios distintos
    // pueden tener el mismo SKU/EAN cargado de forma independiente).
    Optional<Articulo> findByCodigoBarrasAndTenantId(String codigoBarras, Long tenantId);

    // Búsqueda del POS por nombre, SKU o (Farmacia) principio activo — para
    // ofrecer un genérico cuando no hay stock de la marca buscada.
    @Query("""
        SELECT a FROM Articulo a WHERE a.tenantId = :tenantId AND (
            LOWER(a.nombre) LIKE LOWER(CONCAT('%', :texto, '%'))
            OR LOWER(a.sku) LIKE LOWER(CONCAT('%', :texto, '%'))
            OR LOWER(a.principioActivo) LIKE LOWER(CONCAT('%', :texto, '%'))
        )
        """)
    List<Articulo> buscarPorNombreSkuOPrincipioActivo(@Param("tenantId") Long tenantId, @Param("texto") String texto);

    @Query("SELECT a FROM Articulo a WHERE a.tenantId = :tenantId AND a.stockMinimo IS NOT NULL AND a.stockActual < a.stockMinimo")
    List<Articulo> findConStockBajoMinimo(@Param("tenantId") Long tenantId);

    /**
     * Proyección de los tres agregados de inventario que arma
     * GET /api/inventario/kpis — se calculan en una sola pasada por la tabla
     * en vez de traer todos los Articulo a memoria y sumarlos en Java.
     */
    interface InventarioAgregadoProjection {
        BigDecimal getValorBodega();
        BigDecimal getGananciaProyectada();
        Long getAlertasReposicion();
    }

    // COALESCE(..., 0): un tenant sin artículos todavía no debe romper el
    // panel con nulls — debe leer $0 en los tres agregados.
    // "Alerta de reposición" = agotado (stock = 0) o en/bajo su stock mínimo
    // configurado; un artículo sin stockMinimo cargado solo alerta si ya
    // está en cero, no aporta falsos positivos por no tener umbral definido.
    @Query("""
        SELECT
            COALESCE(SUM(a.stockActual * a.costoUnitario), 0) AS valorBodega,
            COALESCE(SUM((a.precioVenta - a.costoUnitario) * a.stockActual), 0) AS gananciaProyectada,
            COALESCE(SUM(CASE WHEN a.stockActual = 0
                OR (a.stockMinimo IS NOT NULL AND a.stockActual <= a.stockMinimo)
                THEN 1L ELSE 0L END), 0) AS alertasReposicion
        FROM Articulo a
        WHERE a.tenantId = :tenantId
        """)
    InventarioAgregadoProjection calcularAgregadosInventario(@Param("tenantId") Long tenantId);
}
