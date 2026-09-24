package com.auroraplus.modules.salud.repositories;

import com.auroraplus.modules.salud.entities.CierreCajaSalud;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CierreCajaSaludRepository extends JpaRepository<CierreCajaSalud, Long> {
    List<CierreCajaSalud> findTop200ByTenantIdOrderByCreadoEnDesc(Long tenantId);
    Optional<CierreCajaSalud> findByIdAndTenantId(Long id, Long tenantId);
    List<CierreCajaSalud> findByTenantId(Long tenantId);
}
