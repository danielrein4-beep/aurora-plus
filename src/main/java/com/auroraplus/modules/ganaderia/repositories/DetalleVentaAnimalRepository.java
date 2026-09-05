package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.DetalleVentaAnimal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DetalleVentaAnimalRepository extends JpaRepository<DetalleVentaAnimal, Long> {
    // Un animal solo se vende una vez (después queda VENDIDO, no vuelve a estar disponible).
    Optional<DetalleVentaAnimal> findByAnimalId(Long animalId);
}
