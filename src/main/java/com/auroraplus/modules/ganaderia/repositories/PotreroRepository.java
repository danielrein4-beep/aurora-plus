package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.Potrero;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PotreroRepository extends JpaRepository<Potrero, Long> {
    List<Potrero> findByTenantId(Long tenantId);
}
