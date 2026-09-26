package com.auroraplus.core.personal.services;

import com.auroraplus.core.personal.entities.NominaEmpleado;
import com.auroraplus.core.personal.entities.PermisoPersonal.RolPersonal;
import com.auroraplus.core.personal.repositories.NominaEmpleadoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.Set;

/**
 * docs/personal-nomina-contract.md §4 — una NominaEmpleado APROBADA/PAGADA/REVERSADA nunca se
 * edita directamente. editarManualmente solo funciona mientras sigue en CALCULADA/EN_REVISION
 * (ej. corregir un error antes de aprobar) — después de eso, la única vía es AjusteNomina.
 *
 * Hallazgo de la revisión de Codex: obtener() no exigía el flag NOMINA_AVANZADA en absoluto, y
 * usaba empleadoIdPropioSiAplica (pensado para asistencia/metas, donde RRHH SÍ puede ver todo) —
 * eso dejaba a RRHH ver montos de nómina de cualquiera, cosa que el contrato §1.2 prohíbe
 * explícitamente. Ahora usa exigirVerNominaDe, que solo deja pasar a NOMINA/AUDITOR (cualquiera)
 * o al propio EMPLEADO (solo la suya) — RRHH y SUPERVISOR quedan fuera de los montos.
 */
@Service
public class NominaEmpleadoService {

    private static final Set<RolPersonal> PUEDEN_EDITAR = EnumSet.of(RolPersonal.NOMINA);

    @Autowired private NominaEmpleadoRepository nominaEmpleadoRepository;
    @Autowired private PersonalAccessService accessService;

    public NominaEmpleado obtener(Long tenantId, Long nominaEmpleadoId) {
        accessService.exigirNomina(tenantId);
        NominaEmpleado nomina = nominaEmpleadoRepository.findByTenantIdAndId(tenantId, nominaEmpleadoId)
            .orElseThrow(() -> new RuntimeException("Nómina de empleado no encontrada"));
        accessService.exigirVerNominaDe(tenantId, nomina.getEmpleadoId());
        return nomina;
    }

    @Transactional
    public NominaEmpleado editarManualmente(Long tenantId, Long nominaEmpleadoId, BigDecimal nuevoNetoAPagar) {
        accessService.exigirNomina(tenantId);
        accessService.exigirRol(tenantId, PUEDEN_EDITAR);
        NominaEmpleado nomina = nominaEmpleadoRepository.findByTenantIdAndId(tenantId, nominaEmpleadoId)
            .orElseThrow(() -> new RuntimeException("Nómina de empleado no encontrada"));
        if (nomina.getEstado() != NominaEmpleado.Estado.CALCULADA && nomina.getEstado() != NominaEmpleado.Estado.EN_REVISION) {
            throw new RuntimeException("Una nómina " + nomina.getEstado() + " no se puede editar directamente — use un ajuste (AjusteNomina)");
        }
        nomina.setNetoAPagar(nuevoNetoAPagar);
        return nominaEmpleadoRepository.save(nomina);
    }
}
