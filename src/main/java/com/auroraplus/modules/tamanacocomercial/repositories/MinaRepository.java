package com.auroraplus.modules.tamanacocomercial.repositories;

import com.auroraplus.modules.tamanacocomercial.entities.Mina;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface MinaRepository extends JpaRepository<Mina, Long> {
    Optional<Mina> findByNombre(String nombre);
    Optional<Mina> findByNombreIgnoreCase(String nombre);
}
