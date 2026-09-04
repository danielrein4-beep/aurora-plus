package com.auroraplus.modules.moda.repositories;

import com.auroraplus.modules.moda.entities.CompraModa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CompraModaRepository extends JpaRepository<CompraModa, Long> {
    List<CompraModa> findAllByOrderByFechaCompraDesc();
}
