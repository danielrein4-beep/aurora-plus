package com.auroraplus.core.personal.services;

import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.core.personal.entities.*;
import com.auroraplus.core.personal.entities.PermisoPersonal.RolPersonal;
import com.auroraplus.core.personal.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Núcleo del motor de nómina — docs/personal-nomina-contract.md §3. No conoce nada de ninguna
 * vertical: lee únicamente Empleado/AsignacionEmpleado/RegistroAsistencia/ConceptoNomina/
 * ReglaNominaVersionada, todos genéricos.
 */
@Service
public class MotorNominaService {

    private static final Set<RolPersonal> PUEDEN_CALCULAR = EnumSet.of(RolPersonal.NOMINA);

    @Autowired private EmpleadoRepository empleadoRepository;
    @Autowired private AsignacionEmpleadoRepository asignacionRepository;
    @Autowired private RegistroAsistenciaRepository asistenciaRepository;
    @Autowired private ConceptoNominaRepository conceptoRepository;
    @Autowired private ReglaNominaService reglaNominaService;
    @Autowired private PeriodoNominaRepository periodoRepository;
    @Autowired private NominaEmpleadoRepository nominaEmpleadoRepository;
    @Autowired private DetalleNominaRepository detalleNominaRepository;
    @Autowired private MotorFinancieroService motorFinancieroService;
    @Autowired private PersonalAccessService accessService;
    @Autowired private AuditoriaPersonalService auditoriaService;

    @Transactional
    public PeriodoNomina calcularPeriodo(Long tenantId, Long periodoId) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_NOMINA_AVANZADA);
        accessService.exigirRol(tenantId, PUEDEN_CALCULAR);

        PeriodoNomina periodo = periodoRepository.findByTenantIdAndId(tenantId, periodoId)
            .orElseThrow(() -> new RuntimeException("Período no encontrado"));
        if (periodo.getEstado() != PeriodoNomina.Estado.BORRADOR) {
            throw new RuntimeException("Solo se puede calcular un período en BORRADOR (estado actual: " + periodo.getEstado() + ")");
        }

        // Reclamo atómico BORRADOR->CALCULADA: el flush inmediato fuerza el chequeo de @Version
        // YA, antes de crear ninguna NominaEmpleado. Si otro hilo ganó la carrera de calcular
        // este mismo período, esto lanza ObjectOptimisticLockingFailureException (409, ver
        // GlobalExceptionHandler) acá mismo — nunca llega a insertar nada duplicado.
        periodo.setEstado(PeriodoNomina.Estado.CALCULADA);
        periodo.setCalculadoPorUsuarioId(accessService.resolverUsuarioIdActual(tenantId));
        periodo.setFechaCalculo(java.time.LocalDateTime.now());
        periodoRepository.saveAndFlush(periodo);

        final PeriodoNomina periodoFinal = periodo;
        String monedaBase = motorFinancieroService.obtenerMonedaBase(tenantId);
        List<Empleado> empleados = empleadoRepository.findByTenantId(tenantId).stream()
            .filter(e -> e.getFechaEgreso() == null || !e.getFechaEgreso().isBefore(periodoFinal.getFechaInicio()))
            .toList();

        for (Empleado empleado : empleados) {
            Optional<AsignacionEmpleado> asignacionOpt = asignacionRepository.buscarVigenteEn(tenantId, empleado.getId(), periodo.getFechaInicio());
            if (asignacionOpt.isEmpty()) continue; // sin cargo asignado en la fecha del período: no se le calcula nómina
            calcularParaEmpleado(tenantId, periodo, empleado, asignacionOpt.get(), monedaBase);
        }

        auditoriaService.registrar(tenantId, periodo.getCalculadoPorUsuarioId(), "CALCULAR", "PeriodoNomina", periodo.getId(),
            "Período calculado: " + periodo.getNombre());
        return periodo;
    }

    /**
     * docs/personal-nomina-contract.md §3 — bonos, comisiones y demás conceptos ASIGNACION
     * (hallazgo de la revisión de Codex: antes se saltaban por completo con un `continue`, solo
     * se pagaba el sueldo base calculado aparte). Se procesan en DOS pasadas: primero TODAS las
     * ASIGNACION (para que el bruto final quede completo sin importar el orden en que estén
     * guardados los conceptos), y solo después DEDUCCION/APORTE_PATRONAL — así una deducción
     * "% del sueldo" siempre calcula sobre el bruto YA con bonos/comisiones incluidos, nunca
     * sobre un total parcial que depende del orden de iteración.
     */
    private void calcularParaEmpleado(Long tenantId, PeriodoNomina periodo, Empleado empleado, AsignacionEmpleado asignacion, String monedaBase) {
        List<DetalleNomina> detalles = new ArrayList<>();

        BigDecimal totalAsignaciones = calcularSueldoBase(tenantId, periodo, asignacion, detalles);
        BigDecimal totalDeducciones = BigDecimal.ZERO;
        BigDecimal totalAportes = BigDecimal.ZERO;

        List<ConceptoNomina> conceptos = conceptoRepository.findByTenantIdAndActivoTrue(tenantId);

        for (ConceptoNomina concepto : conceptos) {
            if (concepto.getTipo() != ConceptoNomina.Tipo.ASIGNACION) continue;
            DetalleNomina detalle = calcularLineaDeConcepto(tenantId, periodo, concepto, totalAsignaciones);
            if (detalle == null) continue;
            detalles.add(detalle);
            totalAsignaciones = totalAsignaciones.add(detalle.getMontoTotal());
        }

        for (ConceptoNomina concepto : conceptos) {
            if (concepto.getTipo() == ConceptoNomina.Tipo.ASIGNACION) continue;
            DetalleNomina detalle = calcularLineaDeConcepto(tenantId, periodo, concepto, totalAsignaciones);
            if (detalle == null) continue;
            detalles.add(detalle);
            if (concepto.getTipo() == ConceptoNomina.Tipo.DEDUCCION) {
                totalDeducciones = totalDeducciones.add(detalle.getMontoTotal());
            } else {
                totalAportes = totalAportes.add(detalle.getMontoTotal());
            }
        }

        BigDecimal netoAPagar = totalAsignaciones.subtract(totalDeducciones).setScale(2, RoundingMode.HALF_UP);

        NominaEmpleado nomina = new NominaEmpleado();
        nomina.setTenantId(tenantId);
        nomina.setPeriodoId(periodo.getId());
        nomina.setEmpleadoId(empleado.getId());
        nomina.setAsignacionEmpleadoId(asignacion.getId());
        nomina.setTotalAsignaciones(totalAsignaciones.setScale(2, RoundingMode.HALF_UP));
        nomina.setTotalDeducciones(totalDeducciones.setScale(2, RoundingMode.HALF_UP));
        nomina.setTotalAportesPatronales(totalAportes.setScale(2, RoundingMode.HALF_UP));
        nomina.setNetoAPagar(netoAPagar);
        nomina.setMoneda(periodo.getMoneda());

        // Congelado una sola vez, acá — nunca se vuelve a convertir con la tasa vigente después
        // (docs/personal-nomina-contract.md §3 punto 4, mismo criterio que finance-contract.md §2.1).
        if (!periodo.getMoneda().equals(monedaBase)) {
            BigDecimal equivalente = motorFinancieroService.convertirMoneda(tenantId, netoAPagar, periodo.getMoneda(), monedaBase);
            nomina.setMontoEquivalenteBase(equivalente);
            nomina.setMonedaBaseEquivalente(monedaBase);
            nomina.setTasaAplicada(netoAPagar.compareTo(BigDecimal.ZERO) > 0
                ? equivalente.divide(netoAPagar, 6, RoundingMode.HALF_UP) : BigDecimal.ZERO);
        }

        NominaEmpleado guardada = nominaEmpleadoRepository.save(nomina);
        for (DetalleNomina detalle : detalles) {
            detalle.setNominaEmpleadoId(guardada.getId());
            detalleNominaRepository.save(detalle);
        }
    }

    /** Concepto activo sin regla vigente => null (no se aplica, no se inventa un valor). Con regla, SIEMPRE produce una línea o revienta — nunca cero silencioso. */
    private DetalleNomina calcularLineaDeConcepto(Long tenantId, PeriodoNomina periodo, ConceptoNomina concepto, BigDecimal baseAsignaciones) {
        Optional<ReglaNominaVersionada> reglaOpt = reglaNominaService.buscarVigenteEnPorConcepto(tenantId, concepto.getId(), periodo.getFechaInicio());
        if (reglaOpt.isEmpty()) return null;

        ReglaNominaVersionada regla = reglaOpt.get();
        BigDecimal monto = aplicarRegla(regla, baseAsignaciones).setScale(2, RoundingMode.HALF_UP);
        if (monto.compareTo(BigDecimal.ZERO) <= 0) return null;

        DetalleNomina detalle = new DetalleNomina();
        detalle.setTenantId(tenantId);
        detalle.setConceptoId(concepto.getId());
        detalle.setReglaAplicadaId(regla.getId());
        detalle.setDescripcion(concepto.getNombre());
        detalle.setMontoTotal(monto);
        detalle.setMoneda(periodo.getMoneda());
        detalle.setTipo(concepto.getTipo());
        return detalle;
    }

    /**
     * docs/personal-nomina-contract.md §3 — un tipoRegla que el motor no reconoce SIEMPRE
     * revienta con un mensaje claro. Hallazgo de la revisión de Codex: antes el caso `default`
     * devolvía BigDecimal.ZERO en silencio — una regla mal escrita (typo en tipoRegla, ej.
     * "PORCENTAJE_SUELDO" en vez de "PORCENTAJE_DEL_SUELDO") se traducía en "este concepto no
     * aporta nada" sin ningún aviso, en vez de fallar visiblemente al calcular el período.
     */
    private BigDecimal aplicarRegla(ReglaNominaVersionada regla, BigDecimal baseAsignaciones) {
        return switch (regla.getTipoRegla()) {
            case "PORCENTAJE_DEL_SUELDO" -> baseAsignaciones.multiply(regla.getValorNumerico())
                .divide(new BigDecimal("100"), 6, RoundingMode.HALF_UP);
            case "MONTO_FIJO" -> regla.getValorNumerico();
            default -> throw new RuntimeException("tipoRegla desconocido para el motor de nómina: \"" + regla.getTipoRegla()
                + "\" (regla id " + regla.getId() + ") — revise la configuración antes de calcular este período");
        };
    }

    /**
     * Tipos de salario soportados por el motor mínimo — docs/personal-nomina-contract.md §3.
     *
     * No convierte entre AsignacionEmpleado.monedaSalario y PeriodoNomina.moneda — eso es una
     * conversión de ENTRADA distinta a la conversión de SALIDA (netoAPagar -> moneda base) que sí
     * se congela en calcularParaEmpleado. Mezclar ambas sin que el usuario lo pida explícitamente
     * arriesgaría una conversión doble o silenciosa; por ahora se exige que coincidan, y calcular
     * un período en una moneda distinta a la pactada del empleado falla con un mensaje claro en
     * vez de adivinar.
     */
    private BigDecimal calcularSueldoBase(Long tenantId, PeriodoNomina periodo, AsignacionEmpleado asignacion, List<DetalleNomina> detalles) {
        if (!asignacion.getMonedaSalario().equals(periodo.getMoneda())) {
            throw new RuntimeException("El salario del empleado está pactado en " + asignacion.getMonedaSalario()
                + " pero el período es en " + periodo.getMoneda() + " — este motor mínimo no convierte automáticamente entre ambas");
        }
        BigDecimal monto;
        String descripcion;
        switch (asignacion.getTipoSalario()) {
            case FIJO_MENSUAL -> {
                long diasPeriodo = ChronoUnit.DAYS.between(periodo.getFechaInicio(), periodo.getFechaFin()) + 1;
                BigDecimal diasTrabajados = contarDiasTrabajados(tenantId, asignacion.getEmpleadoId(), periodo, diasPeriodo);
                monto = asignacion.getSalarioPactado().multiply(diasTrabajados)
                    .divide(BigDecimal.valueOf(diasPeriodo), 6, RoundingMode.HALF_UP);
                descripcion = "Sueldo fijo mensual (" + diasTrabajados + "/" + diasPeriodo + " días)";
            }
            case DIARIO -> {
                BigDecimal diasTrabajados = contarDiasTrabajados(tenantId, asignacion.getEmpleadoId(), periodo, null);
                monto = asignacion.getSalarioPactado().multiply(diasTrabajados);
                descripcion = "Sueldo diario (" + diasTrabajados + " días trabajados)";
            }
            case POR_HORA -> {
                BigDecimal horasTrabajadas = contarHorasTrabajadas(tenantId, asignacion.getEmpleadoId(), periodo);
                monto = asignacion.getSalarioPactado().multiply(horasTrabajadas);
                descripcion = "Sueldo por hora (" + horasTrabajadas + " horas trabajadas)";
            }
            case POR_JORNADA -> {
                BigDecimal jornadas = contarDiasTrabajados(tenantId, asignacion.getEmpleadoId(), periodo, null);
                monto = asignacion.getSalarioPactado().multiply(jornadas);
                descripcion = "Sueldo por jornada (" + jornadas + " jornadas)";
            }
            default -> throw new RuntimeException("Tipo de salario no soportado: " + asignacion.getTipoSalario());
        }

        DetalleNomina detalleSueldo = new DetalleNomina();
        detalleSueldo.setTenantId(tenantId);
        // conceptoId queda null: el sueldo base no deriva de un ConceptoNomina configurado.
        detalleSueldo.setDescripcion(descripcion);
        detalleSueldo.setMontoTotal(monto.setScale(2, RoundingMode.HALF_UP));
        detalleSueldo.setMoneda(periodo.getMoneda());
        detalleSueldo.setTipo(ConceptoNomina.Tipo.ASIGNACION);
        detalles.add(detalleSueldo);

        return monto.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Días con asistencia completa (entrada+salida) dentro del período. Si el tenant no tiene
     * registros de asistencia para este empleado en el período (ej. no activó el flag
     * "asistencia", o es personal asalariado sin control de reloj), se asume el período completo
     * trabajado — comportamiento por defecto razonable para sueldo fijo sin control de asistencia,
     * en vez de forzar a todo tenant a activar asistencia solo para poder pagar nómina básica.
     */
    private BigDecimal contarDiasTrabajados(Long tenantId, Long empleadoId, PeriodoNomina periodo, Long diasPeriodoSiFijo) {
        var registros = asistenciaRepository.findByTenantIdAndEmpleadoIdAndFechaHoraEntradaGreaterThanEqualAndFechaHoraEntradaLessThan(
            tenantId, empleadoId, periodo.getFechaInicio().atStartOfDay(), periodo.getFechaFin().plusDays(1).atStartOfDay());
        if (registros.isEmpty()) {
            long diasPeriodo = diasPeriodoSiFijo != null ? diasPeriodoSiFijo
                : ChronoUnit.DAYS.between(periodo.getFechaInicio(), periodo.getFechaFin()) + 1;
            return BigDecimal.valueOf(diasPeriodo);
        }
        long dias = registros.stream().filter(r -> r.getFechaHoraSalida() != null)
            .map(r -> r.getFechaHoraEntrada().toLocalDate()).distinct().count();
        return BigDecimal.valueOf(dias);
    }

    private BigDecimal contarHorasTrabajadas(Long tenantId, Long empleadoId, PeriodoNomina periodo) {
        var registros = asistenciaRepository.findByTenantIdAndEmpleadoIdAndFechaHoraEntradaGreaterThanEqualAndFechaHoraEntradaLessThan(
            tenantId, empleadoId, periodo.getFechaInicio().atStartOfDay(), periodo.getFechaFin().plusDays(1).atStartOfDay());
        double horas = registros.stream().mapToDouble(r -> r.getHorasTrabajadas()).sum();
        return BigDecimal.valueOf(horas);
    }
}
