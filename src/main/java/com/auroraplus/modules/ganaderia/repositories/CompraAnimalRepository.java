package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.CompraAnimal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CompraAnimalRepository extends JpaRepository<CompraAnimal, Long> {
    List<CompraAnimal> findAllByOrderByFechaCompraDesc();
}
