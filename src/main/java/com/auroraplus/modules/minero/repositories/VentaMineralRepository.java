package com.auroraplus.modules.minero.repositories;

import com.auroraplus.modules.minero.entities.VentaMineral;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface VentaMineralRepository extends JpaRepository<VentaMineral, Long> {
    List<VentaMineral> findAllByOrderByFechaDesc();
}
