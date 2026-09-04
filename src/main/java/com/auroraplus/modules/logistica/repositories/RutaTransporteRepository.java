package com.auroraplus.modules.logistica.repositories;

import com.auroraplus.modules.logistica.entities.RutaTransporte;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RutaTransporteRepository extends JpaRepository<RutaTransporte, Long> {
}
