package com.auroraplus.core.financiero.repositories;

import com.auroraplus.core.financiero.entities.MovimientoCuentaBancaria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MovimientoCuentaBancariaRepository extends JpaRepository<MovimientoCuentaBancaria, Long> {

    List<MovimientoCuentaBancaria> findByTenantIdAndCuentaIdOrderByFechaRegistroDesc(Long tenantId, Long cuentaId);
}
