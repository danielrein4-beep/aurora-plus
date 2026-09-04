package com.auroraplus.modules.moda.repositories;

import com.auroraplus.modules.moda.entities.ProveedorModa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProveedorModaRepository extends JpaRepository<ProveedorModa, Long> {
}
