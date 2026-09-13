package com.auroraplus.modules.retail.repositories;

import com.auroraplus.modules.retail.entities.ItemVentaRetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ItemVentaRetailRepository extends JpaRepository<ItemVentaRetail, Long> {
    List<ItemVentaRetail> findByVentaId(Long ventaId);

    // Base de RetailCosteoProvider (docs/finance-contract.md §3) — costoUnitario ya viene
    // NOT NULL en esta tabla, así que la cobertura de Retail es 100% por diseño de esquema.
    List<ItemVentaRetail> findByTenantIdAndVenta_FechaRegistroGreaterThanEqualAndVenta_FechaRegistroLessThan(
        Long tenantId, LocalDateTime desde, LocalDateTime hastaExclusivo);
}
