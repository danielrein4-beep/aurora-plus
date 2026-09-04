package com.auroraplus.modules.horeca.repositories;

import com.auroraplus.modules.horeca.entities.CompraInsumoHoreca;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CompraInsumoHorecaRepository extends JpaRepository<CompraInsumoHoreca, Long> {
    List<CompraInsumoHoreca> findAllByOrderByFechaCompraDesc();
}
