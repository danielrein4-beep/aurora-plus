package com.auroraplus.core.personal.repositories;

import com.auroraplus.core.personal.entities.Cargo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CargoRepository extends JpaRepository<Cargo, Long> {
    List<Cargo> findByTenantId(Long tenantId);
    Optional<Cargo> findByTenantIdAndId(Long tenantId, Long id);
}
