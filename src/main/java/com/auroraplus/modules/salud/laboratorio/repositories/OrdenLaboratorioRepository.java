package com.auroraplus.modules.salud.laboratorio.repositories;

import com.auroraplus.modules.salud.laboratorio.entities.OrdenLaboratorio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrdenLaboratorioRepository extends JpaRepository<OrdenLaboratorio, Long> {

    Optional<OrdenLaboratorio> findByTokenSeguro(String tokenSeguro);

    List<OrdenLaboratorio> findByTenantIdOrderByFechaEmisionDesc(Long tenantId);

    List<OrdenLaboratorio> findByPacienteIdOrderByFechaEmisionDesc(Long pacienteId);

    List<OrdenLaboratorio> findByTenantIdAndPacienteIdOrderByFechaEmisionDesc(Long tenantId, Long pacienteId);

    List<OrdenLaboratorio> findByTenantIdAndRevisadoPorMedicoFalseAndEstadoOrderByFechaEmisionDesc(Long tenantId, String estado);

    @Query("SELECT COUNT(o) FROM OrdenLaboratorio o WHERE o.tenantId = :tenantId AND o.estado = 'SELLADA' AND o.revisadoPorMedico = false")
    long contarPendientesRevisionInbox(@Param("tenantId") Long tenantId);

    @Query("SELECT o FROM OrdenLaboratorio o WHERE o.tenantId = :tenantId AND o.estado = 'SELLADA' ORDER BY o.fechaEmision DESC")
    List<OrdenLaboratorio> listarParaInbox(@Param("tenantId") Long tenantId);
}
