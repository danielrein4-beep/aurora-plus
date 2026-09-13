package com.auroraplus.core.personal.services;

import com.auroraplus.core.personal.entities.NominaEmpleado;
import com.auroraplus.core.personal.repositories.NominaEmpleadoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * docs/personal-nomina-contract.md §4 — una NominaEmpleado APROBADA/PAGADA/REVERSADA nunca se
 * edita directamente. editarManualmente solo funciona mientras sigue en CALCULADA/EN_REVISION
 * (ej. corregir un error antes de aprobar) — después de eso, la única vía es AjusteNomina.
 */
@Service
public class NominaEmpleadoService {

    @Autowired private NominaEmpleadoRepository nominaEmpleadoRepository;
    @Autowired private PersonalAccessService accessService;

    public NominaEmpleado obtener(Long tenantId, Long nominaEmpleadoId) {
        NominaEmpleado nomina = nominaEmpleadoRepository.findByTenantIdAndId(tenantId, nominaEmpleadoId)
            .orElseThrow(() -> new RuntimeException("Nómina de empleado no encontrada"));
        Long empleadoPropio = accessService.empleadoIdPropioSiAplica(tenantId);
        if (empleadoPropio != null && !empleadoPropio.equals(nomina.getEmpleadoId())) {
            throw new PersonalAccessService.AccesoPersonalDenegadoException("No puedes consultar la nómina de otro empleado");
        }
        return nomina;
    }

    @Transactional
    public NominaEmpleado editarManualmente(Long tenantId, Long nominaEmpleadoId, BigDecimal nuevoNetoAPagar) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_NOMINA_AVANZADA);
        accessService.exigirNoAuditor(tenantId);
        NominaEmpleado nomina = nominaEmpleadoRepository.findByTenantIdAndId(tenantId, nominaEmpleadoId)
            .orElseThrow(() -> new RuntimeException("Nómina de empleado no encontrada"));
        if (nomina.getEstado() != NominaEmpleado.Estado.CALCULADA && nomina.getEstado() != NominaEmpleado.Estado.EN_REVISION) {
            throw new RuntimeException("Una nómina " + nomina.getEstado() + " no se puede editar directamente — use un ajuste (AjusteNomina)");
        }
        nomina.setNetoAPagar(nuevoNetoAPagar);
        return nominaEmpleadoRepository.save(nomina);
    }
}
