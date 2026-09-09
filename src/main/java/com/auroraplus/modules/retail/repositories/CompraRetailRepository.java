package com.auroraplus.modules.retail.repositories;

import com.auroraplus.modules.retail.entities.CompraRetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CompraRetailRepository extends JpaRepository<CompraRetail, Long> {
    List<CompraRetail> findByTenantIdOrderByFechaCompraDesc(Long tenantId);
}
