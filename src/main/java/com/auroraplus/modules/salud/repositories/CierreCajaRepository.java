package com.auroraplus.modules.salud.repositories;

import com.auroraplus.modules.salud.entities.CierreCaja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CierreCajaRepository extends JpaRepository<CierreCaja, Long> {

    List<CierreCaja> findAllByOrderByCreadoEnDesc();
}
