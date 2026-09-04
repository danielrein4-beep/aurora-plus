package com.auroraplus.core.inventario.repositories;

import com.auroraplus.core.inventario.entities.ConteoFisico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ConteoFisicoRepository extends JpaRepository<ConteoFisico, Long> {
    List<ConteoFisico> findAllByOrderByFechaInicioDesc();
}
