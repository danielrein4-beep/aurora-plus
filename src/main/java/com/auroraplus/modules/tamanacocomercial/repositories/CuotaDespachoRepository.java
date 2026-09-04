package com.auroraplus.modules.tamanacocomercial.repositories;

import com.auroraplus.modules.tamanacocomercial.entities.CuotaDespacho;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CuotaDespachoRepository extends JpaRepository<CuotaDespacho, Long> {
    Optional<CuotaDespacho> findTopByEstadoOrderByCreatedAtDesc(String estado);
    List<CuotaDespacho> findByEstadoOrderByCreatedAtDesc(String estado);
}
