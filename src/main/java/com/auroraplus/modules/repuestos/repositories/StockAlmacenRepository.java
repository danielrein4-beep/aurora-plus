package com.auroraplus.modules.repuestos.repositories;

import com.auroraplus.modules.repuestos.entities.StockAlmacen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface StockAlmacenRepository extends JpaRepository<StockAlmacen, Long> {

    List<StockAlmacen> findByTenantIdAndRepuestoId(Long tenantId, Long repuestoId);

    List<StockAlmacen> findByTenantIdAndAlmacenId(Long tenantId, Long almacenId);

    List<StockAlmacen> findByTenantIdAndUbicacionIsNotNull(Long tenantId);

    Optional<StockAlmacen> findByTenantIdAndAlmacenIdAndRepuestoId(Long tenantId, Long almacenId, Long repuestoId);
}
