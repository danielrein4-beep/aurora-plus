package com.auroraplus.modules.salud.repositories;

import com.auroraplus.modules.salud.entities.OdontogramaDiente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OdontogramaDienteRepository extends JpaRepository<OdontogramaDiente, Long> {

    List<OdontogramaDiente> findByTenantIdAndPacienteId(Long tenantId, Long pacienteId);

    Optional<OdontogramaDiente> findByTenantIdAndPacienteIdAndNumeroFdi(Long tenantId, Long pacienteId, Integer numeroFdi);
}
