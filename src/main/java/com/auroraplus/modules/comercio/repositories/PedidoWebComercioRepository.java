package com.auroraplus.modules.comercio.repositories;

import com.auroraplus.modules.comercio.entities.PedidoWebComercio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PedidoWebComercioRepository extends JpaRepository<PedidoWebComercio, Long> {

    List<PedidoWebComercio> findByTenantIdOrderByFechaCreacionDesc(Long tenantId);

    List<PedidoWebComercio> findByTenantIdAndEstadoOrderByFechaCreacionDesc(Long tenantId, String estado);
}
