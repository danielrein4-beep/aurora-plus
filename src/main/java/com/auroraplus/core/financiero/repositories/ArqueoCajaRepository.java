package com.auroraplus.core.financiero.repositories;

import com.auroraplus.core.financiero.entities.ArqueoCaja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface ArqueoCajaRepository extends JpaRepository<ArqueoCaja, Long> {
    Optional<ArqueoCaja> findTopByTenantIdAndMonedaOrderByFechaArqueoDesc(Long tenantId, String moneda);

    // Para reconstruir el período (desde-hasta) de un cierre YA registrado al
    // generar su PDF: el cierre anterior a este marca el inicio del período.
    Optional<ArqueoCaja> findFirstByTenantIdAndMonedaAndFechaArqueoLessThanOrderByFechaArqueoDesc(
        Long tenantId, String moneda, LocalDateTime fechaArqueo);
}
