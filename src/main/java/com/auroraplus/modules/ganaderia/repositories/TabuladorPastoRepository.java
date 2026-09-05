package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.TabuladorPasto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TabuladorPastoRepository extends JpaRepository<TabuladorPasto, Long> {
    List<TabuladorPasto> findByTenantId(Long tenantId);
    Optional<TabuladorPasto> findByTenantIdAndEsGenericoTrue(Long tenantId);
}
