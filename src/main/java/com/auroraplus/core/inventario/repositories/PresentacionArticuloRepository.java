package com.auroraplus.core.inventario.repositories;

import com.auroraplus.core.inventario.entities.PresentacionArticulo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PresentacionArticuloRepository extends JpaRepository<PresentacionArticulo, Long> {
    List<PresentacionArticulo> findByArticuloId(Long articuloId);
}
