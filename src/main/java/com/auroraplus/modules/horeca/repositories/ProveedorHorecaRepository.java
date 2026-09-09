package com.auroraplus.modules.horeca.repositories;

import com.auroraplus.modules.horeca.entities.ProveedorHoreca;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProveedorHorecaRepository extends JpaRepository<ProveedorHoreca, Long> {

    List<ProveedorHoreca> findByTenantId(Long tenantId);
}
