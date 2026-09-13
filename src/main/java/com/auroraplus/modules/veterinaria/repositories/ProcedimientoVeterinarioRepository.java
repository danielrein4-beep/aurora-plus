package com.auroraplus.modules.veterinaria.repositories;

import com.auroraplus.modules.veterinaria.entities.ProcedimientoVeterinario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProcedimientoVeterinarioRepository extends JpaRepository<ProcedimientoVeterinario, Long> {

    List<ProcedimientoVeterinario> findAllByOrderByNombreAsc();
}
