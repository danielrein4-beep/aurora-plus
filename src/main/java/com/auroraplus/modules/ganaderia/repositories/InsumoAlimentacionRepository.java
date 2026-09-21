package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.InsumoAlimentacion;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InsumoAlimentacionRepository extends JpaRepository<InsumoAlimentacion, Long> {
    List<InsumoAlimentacion> findByTenantId(Long tenantId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM InsumoAlimentacion i WHERE i.id = :id AND i.tenantId = :tenantId")
    java.util.Optional<InsumoAlimentacion> findForUpdateByIdAndTenantId(@Param("id") Long id, @Param("tenantId") Long tenantId);
}
