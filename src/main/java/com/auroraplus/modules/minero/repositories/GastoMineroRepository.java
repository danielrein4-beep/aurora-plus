package com.auroraplus.modules.minero.repositories;

import com.auroraplus.modules.minero.entities.GastoMinero;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface GastoMineroRepository extends JpaRepository<GastoMinero, Long> {
    List<GastoMinero> findAllByOrderByFechaDesc();
}
