package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.ProveedorGanaderia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProveedorGanaderiaRepository extends JpaRepository<ProveedorGanaderia, Long> {
    List<ProveedorGanaderia> findByTenantId(Long tenantId);
}
