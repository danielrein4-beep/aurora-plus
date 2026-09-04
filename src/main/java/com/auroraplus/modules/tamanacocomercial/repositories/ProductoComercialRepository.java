package com.auroraplus.modules.tamanacocomercial.repositories;

import com.auroraplus.modules.tamanacocomercial.entities.ProductoComercial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductoComercialRepository extends JpaRepository<ProductoComercial, Long> {
    Optional<ProductoComercial> findByCodigoAndTenantId(String codigo, Long tenantId);
    List<ProductoComercial> findAllByOrderByNombreAsc();
}
