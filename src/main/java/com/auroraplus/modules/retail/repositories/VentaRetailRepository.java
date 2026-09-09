package com.auroraplus.modules.retail.repositories;

import com.auroraplus.modules.retail.entities.VentaRetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface VentaRetailRepository extends JpaRepository<VentaRetail, Long> {
    List<VentaRetail> findByTenantIdOrderByFechaRegistroDesc(Long tenantId);
}
