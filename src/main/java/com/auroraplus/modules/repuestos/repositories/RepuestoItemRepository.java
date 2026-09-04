package com.auroraplus.modules.repuestos.repositories;

import com.auroraplus.modules.repuestos.entities.RepuestoItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RepuestoItemRepository extends JpaRepository<RepuestoItem, Long> {

    Optional<RepuestoItem> findByCodigoSkuAndTenantId(String codigoSku, Long tenantId);

    List<RepuestoItem> findByCodigoOriginalOemAndTenantId(String codigoOriginalOem, Long tenantId);
}
