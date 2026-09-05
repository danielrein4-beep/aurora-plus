package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.GrupoOrdeno;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface GrupoOrdenoRepository extends JpaRepository<GrupoOrdeno, Long> {
    List<GrupoOrdeno> findByTenantIdOrderByOrdenRotacionAsc(Long tenantId);
}
