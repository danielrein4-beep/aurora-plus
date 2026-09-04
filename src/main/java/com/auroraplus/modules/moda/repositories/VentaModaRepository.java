package com.auroraplus.modules.moda.repositories;

import com.auroraplus.modules.moda.entities.VentaModa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface VentaModaRepository extends JpaRepository<VentaModa, Long> {
    List<VentaModa> findAllByOrderByFechaDesc();
}
