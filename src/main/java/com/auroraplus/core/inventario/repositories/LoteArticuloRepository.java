package com.auroraplus.core.inventario.repositories;

import com.auroraplus.core.inventario.entities.LoteArticulo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface LoteArticuloRepository extends JpaRepository<LoteArticulo, Long> {
    List<LoteArticulo> findByArticuloId(Long articuloId);

    List<LoteArticulo> findByTenantIdAndFechaVencimientoIsNotNullAndFechaVencimientoLessThanEqualOrderByFechaVencimientoAsc(
            Long tenantId, LocalDate fechaLimite);
}
