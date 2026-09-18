package com.auroraplus.modules.salud.repositories;

import com.auroraplus.modules.salud.entities.ConfiguracionMedica;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ConfiguracionMedicaRepository extends JpaRepository<ConfiguracionMedica, Long> {
    Optional<ConfiguracionMedica> findByTenantId(Long tenantId);
}
