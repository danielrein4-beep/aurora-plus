package com.auroraplus.modules.salud.repositories;

import com.auroraplus.modules.salud.entities.ProcedimientoMedico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProcedimientoMedicoRepository extends JpaRepository<ProcedimientoMedico, Long> {

    Optional<ProcedimientoMedico> findByCodigo(String codigo);

    List<ProcedimientoMedico> findByActivoTrue();
}
