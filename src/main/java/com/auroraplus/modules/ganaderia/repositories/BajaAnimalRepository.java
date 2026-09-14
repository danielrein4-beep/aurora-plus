package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.BajaAnimal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BajaAnimalRepository extends JpaRepository<BajaAnimal, Long> {
    // ── Método tenant-scoped (P0) ──
    List<BajaAnimal> findByTenantId(Long tenantId);
}
