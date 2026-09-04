package com.auroraplus.core.config.repositories;

import com.auroraplus.core.config.entities.ComisionPlataforma;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ComisionPlataformaRepository extends JpaRepository<ComisionPlataforma, Long> {
    List<ComisionPlataforma> findByTenantId(Long tenantId);
    List<ComisionPlataforma> findByPagada(Boolean pagada);
}
