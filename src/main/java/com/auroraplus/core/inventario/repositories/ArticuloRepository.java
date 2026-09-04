package com.auroraplus.core.inventario.repositories;

import com.auroraplus.core.inventario.entities.Articulo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ArticuloRepository extends JpaRepository<Articulo, Long> {

    Optional<Articulo> findBySkuAndTenantId(String sku, Long tenantId);

    @Query("SELECT a FROM Articulo a WHERE a.tenantId = :tenantId AND a.stockMinimo IS NOT NULL AND a.stockActual < a.stockMinimo")
    List<Articulo> findConStockBajoMinimo(@Param("tenantId") Long tenantId);
}
