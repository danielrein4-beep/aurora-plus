package com.auroraplus.modules.construccion.repositories;

import com.auroraplus.modules.construccion.entities.InsumoConstruccionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface InsumoConstruccionRepository extends JpaRepository<InsumoConstruccionEntity, Long> {
    List<InsumoConstruccionEntity> findByTenantIdOrderByCodigoAsc(Long tenantId);
    Optional<InsumoConstruccionEntity> findByTenantIdAndId(Long tenantId, Long id);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE InsumoConstruccionEntity i SET i.stockActual = i.stockActual - :cantidad, i.version = i.version + 1 " +
           "WHERE i.tenantId = :tenantId AND i.id = :id AND i.stockActual >= :cantidad")
    int descontarStockAtomico(@Param("tenantId") Long tenantId,
                             @Param("id") Long id,
                             @Param("cantidad") BigDecimal cantidad);
}
