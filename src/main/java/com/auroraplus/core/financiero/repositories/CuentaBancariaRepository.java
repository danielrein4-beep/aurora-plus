package com.auroraplus.core.financiero.repositories;

import com.auroraplus.core.financiero.entities.CuentaBancaria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CuentaBancariaRepository extends JpaRepository<CuentaBancaria, Long> {

    List<CuentaBancaria> findByTenantIdOrderByFechaCreacionAsc(Long tenantId);

    Optional<CuentaBancaria> findByIdAndTenantId(Long id, Long tenantId);

    Optional<CuentaBancaria> findByTenantIdAndMetodoPagoVinculado(Long tenantId, String metodoPagoVinculado);
}
