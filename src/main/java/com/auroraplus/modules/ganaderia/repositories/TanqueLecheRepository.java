package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.TanqueLeche;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TanqueLecheRepository extends JpaRepository<TanqueLeche, Long> {
    Optional<TanqueLeche> findByTenantId(Long tenantId);
}
