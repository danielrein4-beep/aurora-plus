package com.auroraplus.modules.minero.repositories;

import com.auroraplus.modules.minero.entities.LiquidacionDestajo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LiquidacionDestajoRepository extends JpaRepository<LiquidacionDestajo, Long> {
    List<LiquidacionDestajo> findAllByOrderByFechaDesc();
}
