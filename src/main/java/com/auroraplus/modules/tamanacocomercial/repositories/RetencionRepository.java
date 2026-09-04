package com.auroraplus.modules.tamanacocomercial.repositories;

import com.auroraplus.modules.tamanacocomercial.entities.Retencion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RetencionRepository extends JpaRepository<Retencion, Long> {
}
