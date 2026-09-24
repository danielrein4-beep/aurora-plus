package com.auroraplus.modules.comercio.repositories;

import com.auroraplus.modules.comercio.entities.VentaMostrador;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface VentaMostradorRepository extends JpaRepository<VentaMostrador, Long> {

    List<VentaMostrador> findByTenantIdOrderByFechaRegistroDesc(Long tenantId, Pageable pageable);

    Optional<VentaMostrador> findByTenantIdAndNumero(Long tenantId, String numero);
}
