package com.auroraplus.modules.horeca.repositories;

import com.auroraplus.modules.horeca.entities.EscandalloReceta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EscandalloRecetaRepository extends JpaRepository<EscandalloReceta, Long> {

    List<EscandalloReceta> findByTenantId(Long tenantId);
}
