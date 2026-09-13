package com.auroraplus.modules.veterinaria.repositories;

import com.auroraplus.modules.veterinaria.entities.CotizacionVeterinaria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CotizacionVeterinariaRepository extends JpaRepository<CotizacionVeterinaria, Long> {

    List<CotizacionVeterinaria> findAllByOrderByCreadoEnDesc();

    List<CotizacionVeterinaria> findByMascotaIdOrderByCreadoEnDesc(Long mascotaId);
}
