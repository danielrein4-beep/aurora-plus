package com.auroraplus.modules.retail.repositories;

import com.auroraplus.modules.retail.entities.ProveedorRetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProveedorRetailRepository extends JpaRepository<ProveedorRetail, Long> {
    List<ProveedorRetail> findByTenantId(Long tenantId);
}
