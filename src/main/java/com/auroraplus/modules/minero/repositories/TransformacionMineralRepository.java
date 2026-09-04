package com.auroraplus.modules.minero.repositories;

import com.auroraplus.modules.minero.entities.TransformacionMineral;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TransformacionMineralRepository extends JpaRepository<TransformacionMineral, Long> {
}
