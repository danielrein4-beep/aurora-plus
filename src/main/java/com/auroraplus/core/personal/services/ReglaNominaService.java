package com.auroraplus.core.personal.services;

import com.auroraplus.core.personal.entities.ConceptoNomina;
import com.auroraplus.core.personal.entities.PermisoPersonal.RolPersonal;
import com.auroraplus.core.personal.entities.ReglaNominaVersionada;
import com.auroraplus.core.personal.repositories.ConceptoNominaRepository;
import com.auroraplus.core.personal.repositories.ReglaNominaVersionadaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * docs/personal-nomina-contract.md §3 — ReglaNominaVersionada es INMUTABLE. "Editar" siempre
 * pasa por crearNuevaVersion, que cierra la vigencia de la anterior y crea una fila nueva; nunca
 * se expone un método que haga UPDATE sobre valorNumerico de una regla existente.
 */
@Service
public class ReglaNominaService {

    private static final Set<RolPersonal> PUEDEN_ESCRIBIR = EnumSet.of(RolPersonal.NOMINA);

    @Autowired
    private ReglaNominaVersionadaRepository reglaRepository;

    @Autowired
    private ConceptoNominaRepository conceptoNominaRepository;

    @Autowired
    private PersonalAccessService accessService;

    @Autowired
    private AuditoriaPersonalService auditoriaService;

    @Transactional
    public ConceptoNomina crearConcepto(Long tenantId, ConceptoNomina concepto) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_NOMINA_AVANZADA);
        accessService.exigirRol(tenantId, PUEDEN_ESCRIBIR);
        concepto.setTenantId(tenantId);
        concepto.setId(null);
        return conceptoNominaRepository.save(concepto);
    }

    @Transactional
    public ReglaNominaVersionada crearNuevaVersion(Long tenantId, ReglaNominaVersionada nueva, LocalDate vigenciaDesde) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_NOMINA_AVANZADA);
        accessService.exigirRol(tenantId, PUEDEN_ESCRIBIR);
        if (nueva.getTipoRegla() == null || nueva.getTipoRegla().isBlank()) {
            throw new RuntimeException("tipoRegla es obligatorio");
        }
        if (nueva.getValorNumerico() == null) {
            throw new RuntimeException("valorNumerico es obligatorio");
        }
        if (nueva.getConceptoId() != null) {
            conceptoNominaRepository.findByTenantIdAndId(tenantId, nueva.getConceptoId())
                .orElseThrow(() -> new RuntimeException("Concepto no encontrado (o no pertenece a este tenant)"));
        }

        // Cierra SOLO la versión abierta de esta combinación exacta (conceptoId + tipoRegla) —
        // ver el comentario de buscarVigenteAbiertaPorConceptoYTipo. Antes esto cerraba por
        // tipoRegla a secas, invalidando por error reglas de OTRO concepto con el mismo tipo.
        reglaRepository.buscarVigenteAbiertaPorConceptoYTipo(tenantId, nueva.getConceptoId(), nueva.getTipoRegla())
            .ifPresent(vigente -> {
                vigente.setVigenciaHasta(vigenciaDesde.minusDays(1));
                reglaRepository.save(vigente);
            });

        nueva.setTenantId(tenantId);
        nueva.setId(null);
        nueva.setVigenciaDesde(vigenciaDesde);
        nueva.setVigenciaHasta(null);
        nueva.setCreadoPorUsuarioId(accessService.resolverUsuarioIdActual(tenantId));
        ReglaNominaVersionada guardada = reglaRepository.save(nueva);
        auditoriaService.registrar(tenantId, nueva.getCreadoPorUsuarioId(), "CREAR_VERSION", "ReglaNominaVersionada",
            guardada.getId(), "Nueva versión de regla " + nueva.getTipoRegla() + " vigente desde " + vigenciaDesde);
        return guardada;
    }

    /** La regla vigente A LA FECHA dada — usada por el motor de cálculo, nunca "la más reciente". */
    public Optional<ReglaNominaVersionada> buscarVigenteEn(Long tenantId, String tipoRegla, LocalDate fecha) {
        List<ReglaNominaVersionada> candidatas = reglaRepository.buscarVigentesEn(tenantId, tipoRegla, fecha);
        return candidatas.isEmpty() ? Optional.empty() : Optional.of(candidatas.get(0));
    }

    /** Igual, para la regla atada a un ConceptoNomina puntual (deducciones/aportes) — ver MotorNominaService. */
    public Optional<ReglaNominaVersionada> buscarVigenteEnPorConcepto(Long tenantId, Long conceptoId, LocalDate fecha) {
        List<ReglaNominaVersionada> candidatas = reglaRepository.buscarVigentesPorConceptoEn(tenantId, conceptoId, fecha);
        return candidatas.isEmpty() ? Optional.empty() : Optional.of(candidatas.get(0));
    }
}
