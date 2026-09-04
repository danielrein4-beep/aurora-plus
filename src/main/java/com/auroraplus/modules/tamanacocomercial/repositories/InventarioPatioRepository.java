package com.auroraplus.modules.tamanacocomercial.repositories;

import com.auroraplus.modules.tamanacocomercial.entities.InventarioPatio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface InventarioPatioRepository extends JpaRepository<InventarioPatio, Long> {
    List<InventarioPatio> findAllByOrderByMinaAscPilaAcopioAsc();
}
