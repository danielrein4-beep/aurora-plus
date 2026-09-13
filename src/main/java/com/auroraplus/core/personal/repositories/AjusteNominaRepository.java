package com.auroraplus.core.personal.repositories;

import com.auroraplus.core.personal.entities.AjusteNomina;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.util.List;

@Repository
public interface AjusteNominaRepository extends JpaRepository<AjusteNomina, Long> {
    List<AjusteNomina> findByTenantIdAndNominaEmpleadoId(Long tenantId, Long nominaEmpleadoId);

    /**
     * Suma de correcciones ya aplicadas — NominaEmpleado.netoAPagar nunca se muta (contrato §4);
     * el "neto efectivo" reportado es siempre netoAPagar (congelado) + esta suma, calculada al
     * vuelo, nunca persistida sobre el registro original.
     */
    @Query("SELECT COALESCE(SUM(a.montoAjuste), 0) FROM AjusteNomina a WHERE a.tenantId = :tenantId "
        + "AND a.nominaEmpleadoId = :nominaEmpleadoId AND a.tipo = 'CORRECCION'")
    BigDecimal sumarCorrecciones(@Param("tenantId") Long tenantId, @Param("nominaEmpleadoId") Long nominaEmpleadoId);
}
