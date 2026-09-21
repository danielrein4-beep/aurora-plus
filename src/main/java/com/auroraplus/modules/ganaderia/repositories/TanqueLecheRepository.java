package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.TanqueLeche;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TanqueLecheRepository extends JpaRepository<TanqueLeche, Long> {
    Optional<TanqueLeche> findByTenantId(Long tenantId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM TanqueLeche t WHERE t.tenantId = :tenantId")
    Optional<TanqueLeche> findForUpdateByTenantId(@Param("tenantId") Long tenantId);
}
