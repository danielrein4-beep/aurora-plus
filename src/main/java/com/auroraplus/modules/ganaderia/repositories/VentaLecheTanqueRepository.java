package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.VentaLecheTanque;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VentaLecheTanqueRepository extends JpaRepository<VentaLecheTanque, Long> {
    List<VentaLecheTanque> findByTenantIdOrderByFechaDesc(Long tenantId);
}
