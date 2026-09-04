package com.auroraplus.modules.minero.repositories;

import com.auroraplus.modules.minero.entities.NominaDestajo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NominaDestajoRepository extends JpaRepository<NominaDestajo, Long> {
}
