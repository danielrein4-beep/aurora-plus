package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.RegistroConsumo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RegistroConsumoRepository extends JpaRepository<RegistroConsumo, Long> {
    List<RegistroConsumo> findByPotreroIdOrderByFechaDesc(Long potreroId);
}
