package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.SociedadCeba;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SociedadCebaRepository extends JpaRepository<SociedadCeba, Long> {
    List<SociedadCeba> findByTenantIdOrderByFechaInicioDesc(Long tenantId);
    Optional<SociedadCeba> findByIdAndTenantId(Long id, Long tenantId);
}
