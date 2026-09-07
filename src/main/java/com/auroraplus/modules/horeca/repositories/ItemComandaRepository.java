package com.auroraplus.modules.horeca.repositories;

import com.auroraplus.modules.horeca.entities.ItemComanda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ItemComandaRepository extends JpaRepository<ItemComanda, Long> {

    // CRÍTICO (fuga entre tenants, hallada en producción): este método antes
    // no recibía tenantId — cualquier cuenta podía ver Y modificar el tablero
    // de cocina de CUALQUIER otro tenant, sin validación alguna. El filtro de
    // Hibernate (TenantInterceptor) no cubre esto porque acá no hay ningún
    // otro control — no basta con confiar en el filtro global, cada acceso a
    // datos por tenant debe llevar tenantId explícito en la query.
    List<ItemComanda> findByTenantIdAndEstacionCocinaAndEstadoItemNot(Long tenantId, String estacionCocina, ItemComanda.EstadoItem estadoItem);

    List<ItemComanda> findByComandaId(Long comandaId);
}
