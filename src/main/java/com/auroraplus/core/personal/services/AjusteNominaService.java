package com.auroraplus.core.personal.services;

import com.auroraplus.core.personal.entities.AjusteNomina;
import com.auroraplus.core.personal.entities.NominaEmpleado;
import com.auroraplus.core.personal.entities.PermisoPersonal.RolPersonal;
import com.auroraplus.core.personal.repositories.AjusteNominaRepository;
import com.auroraplus.core.personal.repositories.NominaEmpleadoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.Set;

/** docs/personal-nomina-contract.md §4 — única vía de corrección de una NominaEmpleado ya APROBADA/PAGADA. */
@Service
public class AjusteNominaService {

    private static final Set<RolPersonal> PUEDEN_AJUSTAR = EnumSet.of(RolPersonal.NOMINA);

    @Autowired private NominaEmpleadoRepository nominaEmpleadoRepository;
    @Autowired private AjusteNominaRepository ajusteNominaRepository;
    @Autowired private PersonalAccessService accessService;
    @Autowired private AuditoriaPersonalService auditoriaService;

    @Transactional
    public AjusteNomina corregir(Long tenantId, Long nominaEmpleadoId, BigDecimal montoAjuste, String motivo) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_NOMINA_AVANZADA);
        accessService.exigirRol(tenantId, PUEDEN_AJUSTAR);
        NominaEmpleado nomina = obtenerOFallar(tenantId, nominaEmpleadoId);
        if (nomina.getEstado() != NominaEmpleado.Estado.APROBADA && nomina.getEstado() != NominaEmpleado.Estado.PAGADA) {
            throw new RuntimeException("Solo se ajusta una nómina APROBADA o PAGADA — mientras está CALCULADA, edítela directamente");
        }
        if (motivo == null || motivo.isBlank()) {
            throw new RuntimeException("El motivo del ajuste es obligatorio");
        }

        Long usuarioId = accessService.resolverUsuarioIdActual(tenantId);
        AjusteNomina ajuste = new AjusteNomina();
        ajuste.setTenantId(tenantId);
        ajuste.setNominaEmpleadoId(nominaEmpleadoId);
        ajuste.setTipo(AjusteNomina.Tipo.CORRECCION);
        ajuste.setMotivo(motivo);
        ajuste.setMontoAjuste(montoAjuste);
        ajuste.setMoneda(nomina.getMoneda());
        ajuste.setCreadoPorUsuarioId(usuarioId);
        AjusteNomina guardado = ajusteNominaRepository.save(ajuste);

        // La línea original de NominaEmpleado NO se toca — el ajuste es un registro aparte que se
        // suma al neto ya congelado, para que la auditoría vea exactamente qué se calculó
        // originalmente y qué se corrigió después, sin mezclar ambos en un solo número mutado.
        nomina.setNetoAPagar(nomina.getNetoAPagar().add(montoAjuste));
        nominaEmpleadoRepository.save(nomina);

        auditoriaService.registrar(tenantId, usuarioId, "CORREGIR", "NominaEmpleado", nominaEmpleadoId, "Ajuste de corrección: " + motivo);
        return guardado;
    }

    @Transactional
    public AjusteNomina reversar(Long tenantId, Long nominaEmpleadoId, String motivo) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_NOMINA_AVANZADA);
        accessService.exigirRol(tenantId, PUEDEN_AJUSTAR);
        NominaEmpleado nomina = obtenerOFallar(tenantId, nominaEmpleadoId);
        if (nomina.getEstado() != NominaEmpleado.Estado.APROBADA && nomina.getEstado() != NominaEmpleado.Estado.PAGADA) {
            throw new RuntimeException("Solo se reversa una nómina APROBADA o PAGADA (estado actual: " + nomina.getEstado() + ")");
        }
        if (motivo == null || motivo.isBlank()) {
            throw new RuntimeException("El motivo del reverso es obligatorio");
        }

        Long usuarioId = accessService.resolverUsuarioIdActual(tenantId);
        nomina.setEstado(NominaEmpleado.Estado.REVERSADA);
        nominaEmpleadoRepository.save(nomina);

        AjusteNomina ajuste = new AjusteNomina();
        ajuste.setTenantId(tenantId);
        ajuste.setNominaEmpleadoId(nominaEmpleadoId);
        ajuste.setTipo(AjusteNomina.Tipo.REVERSO);
        ajuste.setMotivo(motivo);
        ajuste.setCreadoPorUsuarioId(usuarioId);
        AjusteNomina guardado = ajusteNominaRepository.save(ajuste);

        auditoriaService.registrar(tenantId, usuarioId, "REVERSAR", "NominaEmpleado", nominaEmpleadoId, "Reverso: " + motivo);
        return guardado;
    }

    private NominaEmpleado obtenerOFallar(Long tenantId, Long nominaEmpleadoId) {
        return nominaEmpleadoRepository.findByTenantIdAndId(tenantId, nominaEmpleadoId)
            .orElseThrow(() -> new RuntimeException("Nómina de empleado no encontrada"));
    }
}
