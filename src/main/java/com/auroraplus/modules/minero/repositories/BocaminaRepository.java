package com.auroraplus.modules.minero.repositories;

import com.auroraplus.modules.minero.entities.RegistroBocamina;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BocaminaRepository extends JpaRepository<RegistroBocamina, Long> {
}
