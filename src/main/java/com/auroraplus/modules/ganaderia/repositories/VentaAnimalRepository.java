package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.VentaAnimal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface VentaAnimalRepository extends JpaRepository<VentaAnimal, Long> {
    List<VentaAnimal> findAllByOrderByFechaDesc();
}
