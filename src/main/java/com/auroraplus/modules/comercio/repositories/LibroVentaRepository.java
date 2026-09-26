package com.auroraplus.modules.comercio.repositories;

import com.auroraplus.modules.comercio.entities.LibroVenta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LibroVentaRepository extends JpaRepository<LibroVenta, Long> {

    List<LibroVenta> findByTenantIdAndFechaBetweenOrderByFechaAsc(Long tenantId, LocalDateTime desde, LocalDateTime hasta);
}
