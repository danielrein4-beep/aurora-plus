package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.FotoAnimal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FotoAnimalRepository extends JpaRepository<FotoAnimal, Long> {
    List<FotoAnimal> findByAnimalId(Long animalId);
}
