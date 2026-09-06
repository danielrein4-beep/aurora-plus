package com.auroraplus.modules.horeca.repositories;

import com.auroraplus.modules.horeca.entities.FastBarTrago;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FastBarTragoRepository extends JpaRepository<FastBarTrago, Long> {
    List<FastBarTrago> findByTenantId(Long tenantId);
}
