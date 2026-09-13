package com.auroraplus.core.personal.repositories;

import com.auroraplus.core.personal.entities.ConceptoNomina;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ConceptoNominaRepository extends JpaRepository<ConceptoNomina, Long> {
    List<ConceptoNomina> findByTenantIdAndActivoTrue(Long tenantId);
    Optional<ConceptoNomina> findByTenantIdAndId(Long tenantId, Long id);
}
