package com.auroraplus.modules.salud.repositories;

import com.auroraplus.modules.salud.entities.CotizacionMedica;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CotizacionMedicaRepository extends JpaRepository<CotizacionMedica, Long> {

    List<CotizacionMedica> findAllByOrderByCreadoEnDesc();

    List<CotizacionMedica> findByPacienteIdOrderByCreadoEnDesc(Long pacienteId);
}
