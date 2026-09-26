package com.auroraplus.core.config.repositories;

import com.auroraplus.core.config.entities.SaasConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SaasConfigRepository extends JpaRepository<SaasConfig, String> {
}
