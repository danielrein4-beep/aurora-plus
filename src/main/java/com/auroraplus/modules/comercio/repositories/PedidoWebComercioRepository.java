package com.auroraplus.modules.comercio.repositories;

import com.auroraplus.modules.comercio.entities.PedidoWebComercio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PedidoWebComercioRepository extends JpaRepository<PedidoWebComercio, Long> {

    List<PedidoWebComercio> findByTenantIdOrderByFechaCreacionDesc(Long tenantId);

    // El filtro @Filter de tenant ya aisla findById por tenant en el contexto normal
    // (request autenticado), pero subirComprobantePago es un endpoint PÚBLICO sin
    // TenantContext activo — por eso aquí se filtra a mano, explícito, sin depender
    // de ese filtro de Hibernate.
    Optional<PedidoWebComercio> findByIdAndTenantId(Long id, Long tenantId);

    List<PedidoWebComercio> findByTenantIdAndEstadoOrderByFechaCreacionDesc(Long tenantId, String estado);
}
