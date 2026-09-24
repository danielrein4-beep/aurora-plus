package com.auroraplus.modules.repuestos.repositories;

import com.auroraplus.modules.repuestos.entities.Almacen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AlmacenRepository extends JpaRepository<Almacen, Long> {

    List<Almacen> findByTenantIdOrderByEsPrincipalDescNombreAsc(Long tenantId);

    Optional<Almacen> findByIdAndTenantId(Long id, Long tenantId);

    Optional<Almacen> findByTenantIdAndEsPrincipalTrue(Long tenantId);
}
