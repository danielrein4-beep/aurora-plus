package com.auroraplus.modules.veterinaria.repositories;

import com.auroraplus.modules.veterinaria.entities.CierreCajaVet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CierreCajaVetRepository extends JpaRepository<CierreCajaVet, Long> {

    List<CierreCajaVet> findAllByOrderByCreadoEnDesc();
}
