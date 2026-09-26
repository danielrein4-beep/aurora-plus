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
        accessService.exigirNomina(tenantId);
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
            .filter(e -> e.getFechaIngreso() == null || !e.getFechaIngreso().isAfter(periodoFinal.getFechaFin()))
            .toList();

        for (Empleado empleado : empleados) {
            // La asignación vigente al cierre del período (si entró a mitad de la semana, también cuenta).
            Optional<AsignacionEmpleado> asignacionOpt = asignacionRepository.buscarVigenteEn(tenantId, empleado.getId(), periodo.getFechaFin())
                .or(() -> asignacionRepository.buscarVigenteEn(tenantId, empleado.getId(), periodoFinal.getFechaInicio()));
            if (asignacionOpt.isEmpty()) continue; // sin sueldo asignado en el período: no se le calcula nómina
            // Un período semanal solo paga a quien cobra semanal (y así con quincenal y mensual).
            if (periodo.getFrecuencia() != null && !periodo.getFrecuencia().equals(frecuenciaDe(asignacionOpt.get()))) continue;
            NominaEmpleado nomina = new NominaEmpleado();
            nomina.setTenantId(tenantId);
            nomina.setPeriodoId(periodo.getId());
            nomina.setEmpleadoId(empleado.getId());
            calcularParaEmpleado(tenantId, periodo, empleado, asignacionOpt.get(), monedaBase, nomina, null, null);
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
    /**
     * Calcula (o vuelve a calcular) el recibo de un trabajador. {@code ajuste} trae lo que el dueño
     * corrigió al revisar (días, horas, bono, descuento); null = calcular con lo marcado.
     */
    private void calcularParaEmpleado(Long tenantId, PeriodoNomina periodo, Empleado empleado, AsignacionEmpleado asignacion,
                                      String monedaBase, NominaEmpleado nomina, AjusteRevision ajuste, List<DetalleNomina> anteriores) {
        String moneda = asignacion.getMonedaSalario();
        List<DetalleNomina> detalles = new ArrayList<>();

        BigDecimal totalAsignaciones = calcularSueldoBase(tenantId, periodo, empleado, asignacion, moneda, nomina, ajuste, detalles);
        BigDecimal totalDeducciones = BigDecimal.ZERO;
        BigDecimal totalAportes = BigDecimal.ZERO;

        BigDecimal bono = ajuste == null ? nomina.getBono() : ajuste.bono();
        if (bono != null && bono.compareTo(BigDecimal.ZERO) > 0) {
            detalles.add(lineaManual(tenantId, "Bono", bono, moneda, ConceptoNomina.Tipo.ASIGNACION));
            totalAsignaciones = totalAsignaciones.add(bono);
        }
        nomina.setBono(bono != null && bono.compareTo(BigDecimal.ZERO) > 0 ? bono.setScale(2, RoundingMode.HALF_UP) : null);

        List<ConceptoNomina> conceptos = conceptoRepository.findByTenantIdAndActivoTrue(tenantId);

        for (ConceptoNomina concepto : conceptos) {
            if (concepto.getTipo() != ConceptoNomina.Tipo.ASIGNACION) continue;
            DetalleNomina detalle = calcularLineaDeConcepto(tenantId, periodo, concepto, totalAsignaciones, moneda);
            if (detalle == null) continue;
            detalles.add(detalle);
            totalAsignaciones = totalAsignaciones.add(detalle.getMontoTotal());
        }

        for (ConceptoNomina concepto : conceptos) {
            if (concepto.getTipo() == ConceptoNomina.Tipo.ASIGNACION) continue;
            DetalleNomina detalle = calcularLineaDeConcepto(tenantId, periodo, concepto, totalAsignaciones, moneda);
            if (detalle == null) continue;
            detalles.add(detalle);
            if (concepto.getTipo() == ConceptoNomina.Tipo.DEDUCCION) {
                totalDeducciones = totalDeducciones.add(detalle.getMontoTotal());
            } else {
                totalAportes = totalAportes.add(detalle.getMontoTotal());
            }
        }

        BigDecimal descuento = ajuste == null ? nomina.getDescuento() : ajuste.descuento();
        if (descuento != null && descuento.compareTo(BigDecimal.ZERO) > 0) {
            detalles.add(lineaManual(tenantId, "Descuento o adelanto", descuento, moneda, ConceptoNomina.Tipo.DEDUCCION));
            totalDeducciones = totalDeducciones.add(descuento);
        }
        nomina.setDescuento(descuento != null && descuento.compareTo(BigDecimal.ZERO) > 0 ? descuento.setScale(2, RoundingMode.HALF_UP) : null);
        if (ajuste != null) nomina.setNota(ajuste.nota() == null || ajuste.nota().isBlank() ? null : ajuste.nota().trim());

        BigDecimal netoAPagar = totalAsignaciones.subtract(totalDeducciones).setScale(2, RoundingMode.HALF_UP);
        if (netoAPagar.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("El descuento de " + empleado.getNombreCompleto() + " es mayor que lo que le toca cobrar");
        }

        nomina.setAsignacionEmpleadoId(asignacion.getId());
        nomina.setTotalAsignaciones(totalAsignaciones.setScale(2, RoundingMode.HALF_UP));
        nomina.setTotalDeducciones(totalDeducciones.setScale(2, RoundingMode.HALF_UP));
        nomina.setTotalAportesPatronales(totalAportes.setScale(2, RoundingMode.HALF_UP));
        nomina.setNetoAPagar(netoAPagar);
        nomina.setMoneda(moneda);

        // Congelado una sola vez, acá — nunca se vuelve a convertir con la tasa vigente después
        // (docs/personal-nomina-contract.md §3 punto 4, mismo criterio que finance-contract.md §2.1).
        nomina.setMontoEquivalenteBase(null);
        nomina.setMonedaBaseEquivalente(null);
        nomina.setTasaAplicada(null);
        if (!moneda.equals(monedaBase)) {
            BigDecimal equivalente = motorFinancieroService.convertirMoneda(tenantId, netoAPagar, moneda, monedaBase);
            nomina.setMontoEquivalenteBase(equivalente);
            nomina.setMonedaBaseEquivalente(monedaBase);
            nomina.setTasaAplicada(netoAPagar.compareTo(BigDecimal.ZERO) > 0
                ? equivalente.divide(netoAPagar, 6, RoundingMode.HALF_UP) : BigDecimal.ZERO);
        }

        if (anteriores != null) detalleNominaRepository.deleteAll(anteriores);
        NominaEmpleado guardada = nominaEmpleadoRepository.save(nomina);
        for (DetalleNomina detalle : detalles) {
            detalle.setNominaEmpleadoId(guardada.getId());
            detalleNominaRepository.save(detalle);
        }
    }

    /** Lo que el dueño corrige al revisar un recibo antes de pagar. null en días/horas = usar lo marcado. */
    public record AjusteRevision(BigDecimal dias, BigDecimal horas, BigDecimal bono, BigDecimal descuento, String nota) {}

    /**
     * Vuelve a calcular el recibo de un trabajador con lo que el dueño revisó (días u horas
     * trabajadas, bono, descuento). Solo mientras el período no se ha pagado.
     */
    @Transactional
    public NominaEmpleado recalcularRecibo(Long tenantId, Long nominaEmpleadoId, AjusteRevision ajuste) {
        accessService.exigirNomina(tenantId);
        accessService.exigirRol(tenantId, PUEDEN_CALCULAR);
        NominaEmpleado nomina = nominaEmpleadoRepository.findByTenantIdAndId(tenantId, nominaEmpleadoId)
            .orElseThrow(() -> new RuntimeException("Recibo no encontrado"));
        if (nomina.getEstado() != NominaEmpleado.Estado.CALCULADA && nomina.getEstado() != NominaEmpleado.Estado.EN_REVISION) {
            throw new RuntimeException("Este recibo ya se aprobó o se pagó; los cambios van como un ajuste");
        }
        for (BigDecimal v : new BigDecimal[] { ajuste.dias(), ajuste.horas(), ajuste.bono(), ajuste.descuento() }) {
            if (v != null && v.compareTo(BigDecimal.ZERO) < 0) throw new RuntimeException("Los días, horas, bono y descuento no pueden ser negativos");
        }
        PeriodoNomina periodo = periodoRepository.findByTenantIdAndId(tenantId, nomina.getPeriodoId())
            .orElseThrow(() -> new RuntimeException("Período no encontrado"));
        Empleado empleado = empleadoRepository.findByTenantIdAndId(tenantId, nomina.getEmpleadoId())
            .orElseThrow(() -> new RuntimeException("Trabajador no encontrado"));
        AsignacionEmpleado asignacion = asignacionRepository.findById(nomina.getAsignacionEmpleadoId())
            .filter(a -> tenantId.equals(a.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Sueldo del trabajador no encontrado"));
        List<DetalleNomina> anteriores = detalleNominaRepository.findByTenantIdAndNominaEmpleadoId(tenantId, nomina.getId());
        calcularParaEmpleado(tenantId, periodo, empleado, asignacion, motorFinancieroService.obtenerMonedaBase(tenantId), nomina, ajuste, anteriores);
        auditoriaService.registrar(tenantId, accessService.resolverUsuarioIdActual(tenantId), "REVISAR", "NominaEmpleado", nomina.getId(),
            "Recibo revisado antes de pagar: neto " + nomina.getMoneda() + " " + nomina.getNetoAPagar());
        return nomina;
    }

    /** Frecuencia de pago de una asignación (las viejas sin dato cuentan como quincenal, el valor por defecto). */
    public static String frecuenciaDe(AsignacionEmpleado asignacion) {
        return asignacion.getFrecuenciaPago() == null ? "QUINCENAL" : asignacion.getFrecuenciaPago();
    }

    private DetalleNomina lineaManual(Long tenantId, String descripcion, BigDecimal monto, String moneda, ConceptoNomina.Tipo tipo) {
        DetalleNomina detalle = new DetalleNomina();
        detalle.setTenantId(tenantId);
        detalle.setDescripcion(descripcion);
        detalle.setMontoTotal(monto.setScale(2, RoundingMode.HALF_UP));
        detalle.setMoneda(moneda);
        detalle.setTipo(tipo);
        return detalle;
    }

    /** Concepto activo sin regla vigente => null (no se aplica, no se inventa un valor). Con regla, SIEMPRE produce una línea o revienta — nunca cero silencioso. */
    private DetalleNomina calcularLineaDeConcepto(Long tenantId, PeriodoNomina periodo, ConceptoNomina concepto, BigDecimal baseAsignaciones, String moneda) {
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
        detalle.setMoneda(moneda);
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
     * Sueldo del período según cómo se le paga al trabajador:
     * - FIJO_MENSUAL: el sueldo es mensual y se paga por partes según la frecuencia del período:
     *   mes calendario completo = el sueldo entero; quincena (1-15 o 16-fin) = la mitad; cualquier
     *   otro rango (una semana) = días / 30. No se descuenta por días sin marcar (los domingos o los
     *   días libres no se marcan): solo por los días en que todavía no había entrado o ya se fue.
     *   Si el dueño corrige los días al revisar, se paga en proporción a esos días.
     * - DIARIO y POR_JORNADA: sueldo × días (o jornadas) trabajados; salen de lo marcado con su
     *   usuario, y si no marca, del período en que estuvo contratado.
     * - POR_HORA: sueldo × horas marcadas.
     * En todos los casos el dueño puede corregir días u horas al revisar, antes de pagar.
     */
    private BigDecimal calcularSueldoBase(Long tenantId, PeriodoNomina periodo, Empleado empleado, AsignacionEmpleado asignacion,
                                          String moneda, NominaEmpleado nomina, AjusteRevision ajuste, List<DetalleNomina> detalles) {
        long diasPeriodo = ChronoUnit.DAYS.between(periodo.getFechaInicio(), periodo.getFechaFin()) + 1;
        long diasContratado = diasContratadoEnPeriodo(empleado, periodo);
        var registros = asistenciaRepository.findByTenantIdAndEmpleadoIdAndFechaHoraEntradaGreaterThanEqualAndFechaHoraEntradaLessThan(
            tenantId, empleado.getId(), periodo.getFechaInicio().atStartOfDay(), periodo.getFechaFin().plusDays(1).atStartOfDay());
        BigDecimal horasMarcadas = BigDecimal.valueOf(registros.stream().mapToDouble(r -> r.getHorasTrabajadas()).sum())
            .setScale(2, RoundingMode.HALF_UP);
        long diasMarcados = registros.stream().filter(r -> r.getFechaHoraSalida() != null)
            .map(r -> r.getFechaHoraEntrada().toLocalDate()).distinct().count();
        nomina.setHorasMarcadas(horasMarcadas);

        BigDecimal diasCorregidos = ajuste == null ? null : ajuste.dias();
        BigDecimal horasCorregidas = ajuste == null ? null : ajuste.horas();
        BigDecimal salario = asignacion.getSalarioPactado();
        BigDecimal monto;
        BigDecimal cantidad;
        String descripcion;
        switch (asignacion.getTipoSalario()) {
            case FIJO_MENSUAL -> {
                BigDecimal fraccion = fraccionDelMes(periodo, diasPeriodo);
                BigDecimal sueldoDelPeriodo = salario.multiply(fraccion);
                cantidad = diasCorregidos != null ? diasCorregidos : BigDecimal.valueOf(diasContratado);
                monto = sueldoDelPeriodo.multiply(cantidad).divide(BigDecimal.valueOf(diasPeriodo), 6, RoundingMode.HALF_UP);
                descripcion = "Sueldo " + (diasPeriodo == 7 ? "de la semana" : nombrePeriodo(fraccion)) + " (" + cantidad.stripTrailingZeros().toPlainString() + " de " + diasPeriodo + " días)";
            }
            case DIARIO, POR_JORNADA -> {
                cantidad = diasCorregidos != null ? diasCorregidos
                    : BigDecimal.valueOf(registros.isEmpty() ? diasContratado : diasMarcados);
                monto = salario.multiply(cantidad);
                String unidad = asignacion.getTipoSalario() == AsignacionEmpleado.TipoSalario.POR_JORNADA ? "jornadas" : "días trabajados";
                descripcion = "Pago por " + (asignacion.getTipoSalario() == AsignacionEmpleado.TipoSalario.POR_JORNADA ? "jornada" : "día")
                    + " (" + cantidad.stripTrailingZeros().toPlainString() + " " + unidad + ")";
            }
            case POR_HORA -> {
                cantidad = horasCorregidas != null ? horasCorregidas : horasMarcadas;
                monto = salario.multiply(cantidad);
                descripcion = "Pago por hora (" + cantidad.stripTrailingZeros().toPlainString() + " horas)";
            }
            default -> throw new RuntimeException("Tipo de salario no soportado: " + asignacion.getTipoSalario());
        }
        nomina.setDiasTrabajados(asignacion.getTipoSalario() == AsignacionEmpleado.TipoSalario.POR_HORA
            ? BigDecimal.valueOf(registros.isEmpty() ? 0 : diasMarcados) : cantidad);
        if (asignacion.getTipoSalario() == AsignacionEmpleado.TipoSalario.POR_HORA) nomina.setHorasMarcadas(cantidad);

        DetalleNomina detalleSueldo = new DetalleNomina();
        detalleSueldo.setTenantId(tenantId);
        // conceptoId queda null: el sueldo base no deriva de un ConceptoNomina configurado.
        detalleSueldo.setDescripcion(descripcion);
        detalleSueldo.setCantidad(cantidad);
        detalleSueldo.setMontoUnitario(asignacion.getTipoSalario() == AsignacionEmpleado.TipoSalario.FIJO_MENSUAL ? null : salario);
        detalleSueldo.setMontoTotal(monto.setScale(2, RoundingMode.HALF_UP));
        detalleSueldo.setMoneda(moneda);
        detalleSueldo.setTipo(ConceptoNomina.Tipo.ASIGNACION);
        detalles.add(detalleSueldo);

        return monto.setScale(2, RoundingMode.HALF_UP);
    }

    /** Qué parte del sueldo mensual corresponde al período: 1 (mes completo), 1/2 (quincena) o días/30. */
    static BigDecimal fraccionDelMes(PeriodoNomina periodo, long diasPeriodo) {
        var inicio = periodo.getFechaInicio();
        var fin = periodo.getFechaFin();
        boolean mismoMes = inicio.getYear() == fin.getYear() && inicio.getMonth() == fin.getMonth();
        if (mismoMes && inicio.getDayOfMonth() == 1 && fin.getDayOfMonth() == fin.lengthOfMonth()) return BigDecimal.ONE;
        if (mismoMes && ((inicio.getDayOfMonth() == 1 && fin.getDayOfMonth() == 15)
                || (inicio.getDayOfMonth() == 16 && fin.getDayOfMonth() == fin.lengthOfMonth()))) {
            return new BigDecimal("0.5");
        }
        return BigDecimal.valueOf(diasPeriodo).divide(BigDecimal.valueOf(30), 6, RoundingMode.HALF_UP);
    }

    private static String nombrePeriodo(BigDecimal fraccion) {
        if (fraccion.compareTo(BigDecimal.ONE) == 0) return "del mes";
        if (fraccion.compareTo(new BigDecimal("0.5")) == 0) return "de la quincena";
        return "del período";
    }

    /** Días del período en que la persona ya había entrado y todavía no se había ido. */
    private static long diasContratadoEnPeriodo(Empleado empleado, PeriodoNomina periodo) {
        var desde = periodo.getFechaInicio();
        var hasta = periodo.getFechaFin();
        if (empleado.getFechaIngreso() != null && empleado.getFechaIngreso().isAfter(desde)) desde = empleado.getFechaIngreso();
        if (empleado.getFechaEgreso() != null && empleado.getFechaEgreso().isBefore(hasta)) hasta = empleado.getFechaEgreso();
        if (hasta.isBefore(desde)) return 0;
        return ChronoUnit.DAYS.between(desde, hasta) + 1;
    }
}
