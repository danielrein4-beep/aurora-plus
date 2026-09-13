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

/**
 * docs/personal-nomina-contract.md §4 — única vía de corrección de una NominaEmpleado ya
 * APROBADA/PAGADA.
 *
 * Hallazgo de la revisión de Codex: la versión anterior SÍ mutaba netoAPagar del registro
 * original al corregir — eso rompe la garantía de "congelado al calcular" (contrato §3 punto 4):
 * un ajuste posterior no puede reescribir el número que ya se aprobó/pagó, porque entonces
 * releer esa nómina "aprobada" ya no muestra lo que realmente se aprobó. Ahora netoAPagar NUNCA
 * se toca — el AjusteNomina.CORRECCION es el único registro del cambio, y el "neto efectivo"
 * (lo que de verdad se le paga al empleado) se calcula sumando netoAPagar + todas las
 * correcciones vigentes, siempre al vuelo, nunca persistido sobre el original (ver
 * calcularNetoEfectivo).
 */
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
        if (montoAjuste == null) {
            throw new RuntimeException("El monto del ajuste es obligatorio");
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

        // netoAPagar, montoEquivalenteBase y tasaAplicada de NominaEmpleado NUNCA se tocan acá —
        // el ajuste queda como su propio registro compensatorio, inmutable, aparte.
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

        // Reclamo atómico del estado ANTES de insertar el AjusteNomina — mismo criterio que
        // MotorNominaService.calcularPeriodo: el flush inmediato fuerza el chequeo de @Version
        // ya, así que si dos usuarios reversan la MISMA nómina al mismo tiempo, el segundo
        // recibe un conflicto de concurrencia (409) acá mismo y nunca llega a insertar un
        // segundo registro de reverso duplicado. netoAPagar/montoEquivalenteBase/tasaAplicada
        // tampoco se tocan — quedan como el registro histórico de lo que se calculó.
        nomina.setEstado(NominaEmpleado.Estado.REVERSADA);
        nominaEmpleadoRepository.saveAndFlush(nomina);

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

    /** netoAPagar (congelado) + todas las correcciones ya aplicadas — nunca persistido, siempre calculado. */
    public BigDecimal calcularNetoEfectivo(Long tenantId, NominaEmpleado nomina) {
        return nomina.getNetoAPagar().add(ajusteNominaRepository.sumarCorrecciones(tenantId, nomina.getId()));
    }

    private NominaEmpleado obtenerOFallar(Long tenantId, Long nominaEmpleadoId) {
        return nominaEmpleadoRepository.findByTenantIdAndId(tenantId, nominaEmpleadoId)
            .orElseThrow(() -> new RuntimeException("Nómina de empleado no encontrada"));
    }
}
