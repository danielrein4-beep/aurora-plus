package com.auroraplus.modules.tamanacocomercial.repositories;

import com.auroraplus.modules.tamanacocomercial.entities.Chofer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChoferRepository extends JpaRepository<Chofer, Long> {
    Optional<Chofer> findByCedula(String cedula);
    List<Chofer> findAllByOrderByNombreCompletoAsc();
}
