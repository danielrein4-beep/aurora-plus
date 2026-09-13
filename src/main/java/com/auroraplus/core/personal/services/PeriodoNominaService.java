package com.auroraplus.core.personal.services;

import com.auroraplus.core.personal.entities.NominaEmpleado;
import com.auroraplus.core.personal.entities.PeriodoNomina;
import com.auroraplus.core.personal.entities.PermisoPersonal.RolPersonal;
import com.auroraplus.core.personal.repositories.NominaEmpleadoRepository;
import com.auroraplus.core.personal.repositories.PeriodoNominaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/** docs/personal-nomina-contract.md §4 — transiciones de estado del período (y en cascada, de cada NominaEmpleado). */
@Service
public class PeriodoNominaService {

    private static final Set<RolPersonal> PUEDEN_APROBAR = EnumSet.of(RolPersonal.NOMINA);

    @Autowired private PeriodoNominaRepository periodoRepository;
    @Autowired private NominaEmpleadoRepository nominaEmpleadoRepository;
    @Autowired private PersonalAccessService accessService;
    @Autowired private AuditoriaPersonalService auditoriaService;

    @Transactional
    public PeriodoNomina crear(Long tenantId, PeriodoNomina periodo) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_NOMINA_AVANZADA);
        accessService.exigirRol(tenantId, PUEDEN_APROBAR);
        periodo.setTenantId(tenantId);
        periodo.setId(null);
        periodo.setEstado(PeriodoNomina.Estado.BORRADOR);
        return periodoRepository.save(periodo);
    }

    @Transactional
    public PeriodoNomina aprobar(Long tenantId, Long periodoId) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_NOMINA_AVANZADA);
        accessService.exigirRol(tenantId, PUEDEN_APROBAR);
        PeriodoNomina periodo = obtenerOFallar(tenantId, periodoId);
        if (periodo.getEstado() != PeriodoNomina.Estado.CALCULADA && periodo.getEstado() != PeriodoNomina.Estado.EN_REVISION) {
            throw new RuntimeException("Solo se puede aprobar un período CALCULADA o EN_REVISION (estado actual: " + periodo.getEstado() + ")");
        }
        Long usuarioId = accessService.resolverUsuarioIdActual(tenantId);
        periodo.setEstado(PeriodoNomina.Estado.APROBADA);
        periodo.setAprobadoPorUsuarioId(usuarioId);
        periodo.setFechaAprobacion(LocalDateTime.now());
        periodoRepository.save(periodo);

        for (NominaEmpleado nomina : nominaEmpleadoRepository.findByTenantIdAndPeriodoId(tenantId, periodoId)) {
            nomina.setEstado(NominaEmpleado.Estado.APROBADA);
            nominaEmpleadoRepository.save(nomina);
        }
        auditoriaService.registrar(tenantId, usuarioId, "APROBAR", "PeriodoNomina", periodoId, "Período aprobado: " + periodo.getNombre());
        return periodo;
    }

    @Transactional
    public PeriodoNomina marcarPagada(Long tenantId, Long periodoId) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_NOMINA_AVANZADA);
        accessService.exigirRol(tenantId, PUEDEN_APROBAR);
        PeriodoNomina periodo = obtenerOFallar(tenantId, periodoId);
        if (periodo.getEstado() != PeriodoNomina.Estado.APROBADA) {
            throw new RuntimeException("Solo se puede marcar como pagado un período APROBADA (estado actual: " + periodo.getEstado() + ")");
        }
        Long usuarioId = accessService.resolverUsuarioIdActual(tenantId);
        periodo.setEstado(PeriodoNomina.Estado.PAGADA);
        periodoRepository.save(periodo);

        for (NominaEmpleado nomina : nominaEmpleadoRepository.findByTenantIdAndPeriodoId(tenantId, periodoId)) {
            nomina.setEstado(NominaEmpleado.Estado.PAGADA);
            nominaEmpleadoRepository.save(nomina);
        }
        auditoriaService.registrar(tenantId, usuarioId, "MARCAR_PAGADA", "PeriodoNomina", periodoId, "Período marcado como pagado: " + periodo.getNombre());
        return periodo;
    }

    /** Lista con MONTOS de todos los empleados de un período — solo NOMINA/AUDITOR (nunca RRHH, ver contrato §1.2). */
    public List<NominaEmpleado> listarNominasDelPeriodo(Long tenantId, Long periodoId) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_NOMINA_AVANZADA);
        accessService.exigirVerMontosDeNominaEnGeneral(tenantId);
        return nominaEmpleadoRepository.findByTenantIdAndPeriodoId(tenantId, periodoId);
    }

    private PeriodoNomina obtenerOFallar(Long tenantId, Long periodoId) {
        return periodoRepository.findByTenantIdAndId(tenantId, periodoId)
            .orElseThrow(() -> new RuntimeException("Período no encontrado"));
    }
}
