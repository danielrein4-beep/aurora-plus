package com.auroraplus.modules.horeca.repositories;

import com.auroraplus.modules.horeca.entities.MeseroHoreca;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MeseroHorecaRepository extends JpaRepository<MeseroHoreca, Long> {

    List<MeseroHoreca> findByTenantId(Long tenantId);
}
