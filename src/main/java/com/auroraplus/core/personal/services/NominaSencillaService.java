package com.auroraplus.core.personal.services;

import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.core.personal.entities.*;
import com.auroraplus.core.personal.entities.PermisoPersonal.RolPersonal;
import com.auroraplus.core.personal.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Nómina cómoda para el dueño de cualquier rubro, sobre el motor de nómina:
 * 1. A cada trabajador se le pone su sueldo: cargo, cuánto gana, en qué moneda y si cobra semanal,
 *    quincenal o mensual.
 * 2. "Pagar nómina": se prepara el período de una frecuencia (la semana, la quincena o el mes) y el
 *    motor calcula el recibo de cada quien con lo que marcó.
 * 3. El dueño revisa (días, horas, bono, descuento) y paga: sale un egreso en caja por cada recibo
 *    y queda el recibo para imprimir.
 */
@Service
public class NominaSencillaService {

    public static final Set<String> FRECUENCIAS = Set.of("SEMANAL", "QUINCENAL", "MENSUAL");
    private static final Set<RolPersonal> PUEDEN_PAGAR = EnumSet.of(RolPersonal.NOMINA);
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Autowired private EmpleadoRepository empleadoRepository;
    @Autowired private AsignacionEmpleadoRepository asignacionRepository;
    @Autowired private CargoRepository cargoRepository;
    @Autowired private PermisoPersonalRepository permisoRepository;
    @Autowired private RegistroAsistenciaRepository asistenciaRepository;
    @Autowired private PeriodoNominaRepository periodoRepository;
    @Autowired private NominaEmpleadoRepository nominaRepository;
    @Autowired private DetalleNominaRepository detalleRepository;
    @Autowired private AjusteNominaRepository ajusteRepository;
    @Autowired private LicenciaTenantRepository licenciaRepository;
    @Autowired private EmpleadoService empleadoService;
    @Autowired private MotorNominaService motorNominaService;
    @Autowired private PeriodoNominaService periodoNominaService;
    @Autowired private MotorFinancieroService motorFinancieroService;
    @Autowired private PersonalAccessService accessService;
    @Autowired private AuditoriaPersonalService auditoriaService;
    @Autowired private AjusteNominaService ajusteService;

    // ---------------------------------------------------------------- trabajadores y sueldos

    public record Trabajador(
        Long id, String nombre, String cedula, LocalDate fechaIngreso, LocalDate fechaEgreso,
        String cargo, String tipoSalario, BigDecimal salario, String moneda, String frecuencia,
        boolean tieneUsuario, BigDecimal horasSemana, long diasSemana, boolean trabajandoAhora,
        LocalDate ultimoPagoHasta
    ) {}

    /** Cada trabajador con su sueldo y lo que ha trabajado esta semana (lunes a hoy), según lo que marcó. */
    public List<Trabajador> trabajadores(Long tenantId) {
        accessService.exigirNomina(tenantId);
        accessService.exigirVerMontosDeNominaEnGeneral(tenantId);
        LocalDate lunes = LocalDate.now().with(DayOfWeek.MONDAY);
        Map<Long, AsignacionEmpleado> vigentes = new HashMap<>();
        for (AsignacionEmpleado a : asignacionRepository.findByTenantIdAndVigenciaHastaIsNull(tenantId)) vigentes.putIfAbsent(a.getEmpleadoId(), a);
        Map<Long, String> cargos = new HashMap<>();
        for (Cargo c : cargoRepository.findByTenantId(tenantId)) cargos.put(c.getId(), c.getNombre());
        Map<Long, LocalDate> ultimoPago = new HashMap<>();
        Map<Long, PeriodoNomina> periodos = new HashMap<>();
        for (PeriodoNomina p : periodoRepository.findByTenantId(tenantId)) periodos.put(p.getId(), p);

        List<Trabajador> lista = new ArrayList<>();
        for (Empleado e : empleadoRepository.findByTenantId(tenantId)) {
            for (NominaEmpleado n : nominaRepository.findByTenantIdAndEmpleadoId(tenantId, e.getId())) {
                PeriodoNomina p = periodos.get(n.getPeriodoId());
                if (n.getEstado() == NominaEmpleado.Estado.PAGADA && p != null) {
                    ultimoPago.merge(e.getId(), p.getFechaFin(), (x, y) -> x.isAfter(y) ? x : y);
                }
            }
            var registros = asistenciaRepository.findByTenantIdAndEmpleadoIdAndFechaHoraEntradaGreaterThanEqualAndFechaHoraEntradaLessThan(
                tenantId, e.getId(), lunes.atStartOfDay(), LocalDate.now().plusDays(1).atStartOfDay());
            BigDecimal horas = BigDecimal.valueOf(registros.stream().mapToDouble(r -> r.getHorasTrabajadas()).sum()).setScale(1, RoundingMode.HALF_UP);
            long dias = registros.stream().map(r -> r.getFechaHoraEntrada().toLocalDate()).distinct().count();
            boolean trabajando = registros.stream().anyMatch(r -> r.getFechaHoraSalida() == null);
            boolean tieneUsuario = e.getUsuarioId() != null
                || permisoRepository.findByTenantIdAndEmpleadoId(tenantId, e.getId()).stream().anyMatch(p -> p.getUsuarioId() != null);
            AsignacionEmpleado a = vigentes.get(e.getId());
            lista.add(new Trabajador(e.getId(), e.getNombreCompleto(), e.getDocumentoIdentidad(), e.getFechaIngreso(), e.getFechaEgreso(),
                a == null ? null : cargos.get(a.getCargoId()),
                a == null ? null : a.getTipoSalario().name(),
                a == null ? null : a.getSalarioPactado(),
                a == null ? null : a.getMonedaSalario(),
                a == null ? null : MotorNominaService.frecuenciaDe(a),
                tieneUsuario, horas, dias, trabajando, ultimoPago.get(e.getId())));
        }
        lista.sort(Comparator.comparing(Trabajador::nombre, String.CASE_INSENSITIVE_ORDER));
        return lista;
    }

    public record SueldoRequest(String cargo, String tipoSalario, BigDecimal salario, String moneda, String frecuencia) {}

    /**
     * Pone o cambia el sueldo de un trabajador. La primera vez rige desde su fecha de ingreso (para
     * poder pagarle lo ya trabajado); un cambio rige desde hoy y lo anterior queda en el historial.
     */
    @Transactional
    public AsignacionEmpleado ponerSueldo(Long tenantId, Long empleadoId, SueldoRequest r) {
        accessService.exigirNomina(tenantId);
        Empleado empleado = empleadoRepository.findByTenantIdAndId(tenantId, empleadoId)
            .orElseThrow(() -> new RuntimeException("Trabajador no encontrado"));
        String nombreCargo = r.cargo() == null ? "" : r.cargo().trim();
        if (nombreCargo.isEmpty()) throw new RuntimeException("Escribe el cargo (por ejemplo: cajero, mesero, obrero)");
        if (r.salario() == null || r.salario().compareTo(BigDecimal.ZERO) <= 0) throw new RuntimeException("El sueldo debe ser mayor a cero");
        AsignacionEmpleado.TipoSalario tipo;
        try {
            tipo = AsignacionEmpleado.TipoSalario.valueOf(r.tipoSalario());
        } catch (Exception ex) {
            throw new RuntimeException("Forma de pago no válida");
        }
        String frecuencia = r.frecuencia() == null ? "QUINCENAL" : r.frecuencia();
        if (!FRECUENCIAS.contains(frecuencia)) throw new RuntimeException("La frecuencia debe ser semanal, quincenal o mensual");
        String moneda = r.moneda() == null ? "USD" : r.moneda().trim().toUpperCase();
        if (!Set.of("USD", "VES", "COP", "EUR").contains(moneda)) throw new RuntimeException("Moneda no válida");

        Cargo cargo = cargoRepository.findByTenantId(tenantId).stream()
            .filter(c -> c.getNombre() != null && c.getNombre().trim().equalsIgnoreCase(nombreCargo))
            .findFirst()
            .orElseGet(() -> {
                Cargo nuevo = new Cargo();
                nuevo.setTenantId(tenantId);
                nuevo.setNombre(nombreCargo.substring(0, 1).toUpperCase() + nombreCargo.substring(1));
                return cargoRepository.save(nuevo);
            });

        Optional<AsignacionEmpleado> actual = asignacionRepository.findByTenantIdAndEmpleadoIdAndVigenciaHastaIsNull(tenantId, empleadoId);
        LocalDate hoy = LocalDate.now();
        // Cambio el mismo día en que se puso (una corrección): se corrige esa misma, sin partir el historial.
        if (actual.isPresent() && !actual.get().getVigenciaDesde().isBefore(hoy) && !estaEnUnaNomina(tenantId, actual.get())) {
            AsignacionEmpleado a = actual.get();
            accessService.exigirRol(tenantId, EnumSet.of(RolPersonal.RRHH, RolPersonal.NOMINA));
            a.setCargoId(cargo.getId());
            a.setTipoSalario(tipo);
            a.setSalarioPactado(r.salario().setScale(2, RoundingMode.HALF_UP));
            a.setMonedaSalario(moneda);
            a.setFrecuenciaPago(frecuencia);
            AsignacionEmpleado guardada = asignacionRepository.save(a);
            auditoriaService.registrar(tenantId, accessService.resolverUsuarioIdActual(tenantId), "CORREGIR_SUELDO", "Empleado", empleadoId,
                "Sueldo corregido: " + moneda + " " + guardada.getSalarioPactado() + " " + frecuencia);
            return guardada;
        }
        AsignacionEmpleado nueva = new AsignacionEmpleado();
        nueva.setCargoId(cargo.getId());
        nueva.setTipoSalario(tipo);
        nueva.setSalarioPactado(r.salario().setScale(2, RoundingMode.HALF_UP));
        nueva.setMonedaSalario(moneda);
        nueva.setFrecuenciaPago(frecuencia);
        LocalDate desde = actual.isPresent() ? hoy
            : (empleado.getFechaIngreso() != null && empleado.getFechaIngreso().isBefore(hoy) ? empleado.getFechaIngreso() : hoy);
        return empleadoService.asignarCargo(tenantId, empleadoId, nueva, desde);
    }

    private boolean estaEnUnaNomina(Long tenantId, AsignacionEmpleado a) {
        return nominaRepository.findByTenantIdAndEmpleadoId(tenantId, a.getEmpleadoId()).stream()
            .anyMatch(n -> a.getId().equals(n.getAsignacionEmpleadoId()));
    }

    // ---------------------------------------------------------------- preparar, revisar y pagar

    /**
     * Prepara la nómina de una frecuencia en unas fechas y la calcula. Si ya hay una preparada con
     * esas mismas fechas, se retoma (no se duplica); si esas fechas ya se pagaron, se avisa.
     */
    @Transactional
    public PeriodoNomina preparar(Long tenantId, String frecuencia, LocalDate desde, LocalDate hasta) {
        accessService.exigirNomina(tenantId);
        accessService.exigirRol(tenantId, PUEDEN_PAGAR);
        if (!FRECUENCIAS.contains(frecuencia)) throw new RuntimeException("La frecuencia debe ser semanal, quincenal o mensual");
        if (desde == null || hasta == null || hasta.isBefore(desde)) throw new RuntimeException("Revisa las fechas del período");
        if (java.time.temporal.ChronoUnit.DAYS.between(desde, hasta) > 31) throw new RuntimeException("El período no puede pasar de un mes");

        for (PeriodoNomina p : periodoRepository.findByTenantId(tenantId)) {
            if (!frecuencia.equals(p.getFrecuencia()) || p.getEstado() == PeriodoNomina.Estado.REVERSADA) continue;
            boolean seCruzan = !p.getFechaInicio().isAfter(hasta) && !p.getFechaFin().isBefore(desde);
            if (!seCruzan) continue;
            boolean abierta = p.getEstado() == PeriodoNomina.Estado.BORRADOR || p.getEstado() == PeriodoNomina.Estado.CALCULADA
                || p.getEstado() == PeriodoNomina.Estado.EN_REVISION;
            if (abierta && p.getFechaInicio().equals(desde) && p.getFechaFin().equals(hasta)) {
                return p.getEstado() == PeriodoNomina.Estado.BORRADOR ? motorNominaService.calcularPeriodo(tenantId, p.getId()) : p;
            }
            if (abierta) throw new RuntimeException("Ya tienes una nómina preparada del " + p.getFechaInicio().format(FMT) + " al "
                + p.getFechaFin().format(FMT) + ". Págala o descártala antes de preparar otra.");
            throw new RuntimeException("Esas fechas ya se pagaron (" + p.getNombre() + ").");
        }

        PeriodoNomina periodo = new PeriodoNomina();
        periodo.setNombre(nombrePeriodo(frecuencia, desde, hasta));
        periodo.setFechaInicio(desde);
        periodo.setFechaFin(hasta);
        periodo.setFechaPagoPlanificada(LocalDate.now());
        periodo.setMoneda(motorFinancieroService.obtenerMonedaBase(tenantId));
        periodo.setFrecuencia(frecuencia);
        periodo = periodoNominaService.crear(tenantId, periodo);
        periodo = motorNominaService.calcularPeriodo(tenantId, periodo.getId());
        if (nominaRepository.findByTenantIdAndPeriodoId(tenantId, periodo.getId()).isEmpty()) {
            // Nadie cobra con esa frecuencia (o nadie tiene sueldo): no se deja un período vacío.
            periodoRepository.delete(periodo);
            throw new RuntimeException("Nadie cobra " + frecuencia.toLowerCase() + " o falta ponerle el sueldo a tus trabajadores.");
        }
        return periodo;
    }

    /** Quita a un trabajador de una nómina que todavía no se paga ("no pagarle ahora"). */
    @Transactional
    public void quitarRecibo(Long tenantId, Long nominaEmpleadoId) {
        accessService.exigirNomina(tenantId);
        accessService.exigirRol(tenantId, PUEDEN_PAGAR);
        NominaEmpleado n = nominaRepository.findByTenantIdAndId(tenantId, nominaEmpleadoId)
            .orElseThrow(() -> new RuntimeException("Recibo no encontrado"));
        if (n.getEstado() != NominaEmpleado.Estado.CALCULADA && n.getEstado() != NominaEmpleado.Estado.EN_REVISION) {
            throw new RuntimeException("Este recibo ya se pagó; no se puede quitar");
        }
        borrarRecibo(tenantId, n);
    }

    /** Descarta una nómina preparada que todavía no se paga. */
    @Transactional
    public void descartar(Long tenantId, Long periodoId) {
        accessService.exigirNomina(tenantId);
        accessService.exigirRol(tenantId, PUEDEN_PAGAR);
        PeriodoNomina p = periodoRepository.findByTenantIdAndId(tenantId, periodoId)
            .orElseThrow(() -> new RuntimeException("Período no encontrado"));
        if (p.getEstado() == PeriodoNomina.Estado.APROBADA || p.getEstado() == PeriodoNomina.Estado.PAGADA) {
            throw new RuntimeException("Esta nómina ya se pagó; no se puede descartar");
        }
        for (NominaEmpleado n : nominaRepository.findByTenantIdAndPeriodoId(tenantId, periodoId)) borrarRecibo(tenantId, n);
        periodoRepository.delete(p);
        auditoriaService.registrar(tenantId, accessService.resolverUsuarioIdActual(tenantId), "DESCARTAR", "PeriodoNomina", periodoId,
            "Nómina descartada sin pagar: " + p.getNombre());
    }

    private void borrarRecibo(Long tenantId, NominaEmpleado n) {
        detalleRepository.deleteAll(detalleRepository.findByTenantIdAndNominaEmpleadoId(tenantId, n.getId()));
        ajusteRepository.deleteAll(ajusteRepository.findByTenantIdAndNominaEmpleadoId(tenantId, n.getId()));
        nominaRepository.delete(n);
    }

    /**
     * Paga la nómina: la aprueba, registra un egreso en caja por cada recibo (en la moneda de ese
     * trabajador) y la marca pagada. Todo o nada: si falla un egreso, no queda nada a medias.
     */
    @Transactional
    public PeriodoNomina pagar(Long tenantId, Long periodoId) {
        accessService.exigirNomina(tenantId);
        accessService.exigirRol(tenantId, PUEDEN_PAGAR);
        PeriodoNomina periodo = periodoRepository.findByTenantIdAndId(tenantId, periodoId)
            .orElseThrow(() -> new RuntimeException("Período no encontrado"));
        if (periodo.getEstado() == PeriodoNomina.Estado.PAGADA) throw new RuntimeException("Esta nómina ya está pagada");
        List<NominaEmpleado> recibos = nominaRepository.findByTenantIdAndPeriodoId(tenantId, periodoId);
        if (recibos.isEmpty()) throw new RuntimeException("Esta nómina no tiene a nadie por pagar");

        if (periodo.getEstado() != PeriodoNomina.Estado.APROBADA) periodoNominaService.aprobar(tenantId, periodoId);
        LocalDateTime ahora = LocalDateTime.now();
        for (NominaEmpleado n : nominaRepository.findByTenantIdAndPeriodoId(tenantId, periodoId)) {
            if (n.getNetoAPagar().compareTo(BigDecimal.ZERO) > 0) {
                String nombre = empleadoRepository.findByTenantIdAndId(tenantId, n.getEmpleadoId()).map(Empleado::getNombreCompleto).orElse("Trabajador");
                MovimientoCaja mov = motorFinancieroService.registrarMovimientoEnMoneda(tenantId, MovimientoCaja.TipoMovimiento.EGRESO,
                    n.getNetoAPagar(), n.getMoneda(), "Nómina: " + nombre + " (" + periodo.getNombre() + ")",
                    "PERSONAL_NOMINA", "NominaEmpleado", n.getId());
                n.setMovimientoCajaId(mov.getId());
            }
            n.setFechaPago(ahora);
            nominaRepository.save(n);
        }
        return periodoNominaService.marcarPagada(tenantId, periodoId);
    }

    // ---------------------------------------------------------------- recibo para imprimir

    public record LineaRecibo(String descripcion, String tipo, BigDecimal monto) {}

    public record ReciboImprimible(
        Long id, String estado, String negocio, String razonSocial, String rif, String direccion, String telefono,
        String trabajador, String cedula, String cargo, String formaDePago, String frecuencia,
        String periodo, LocalDate desde, LocalDate hasta, LocalDateTime fechaPago,
        BigDecimal diasTrabajados, BigDecimal horasMarcadas, String moneda,
        List<LineaRecibo> lineas, BigDecimal totalAsignaciones, BigDecimal totalDeducciones, BigDecimal neto,
        BigDecimal netoEfectivo, String nota
    ) {}

    public ReciboImprimible recibo(Long tenantId, Long nominaEmpleadoId) {
        accessService.exigirNomina(tenantId);
        NominaEmpleado n = nominaRepository.findByTenantIdAndId(tenantId, nominaEmpleadoId)
            .orElseThrow(() -> new RuntimeException("Recibo no encontrado"));
        accessService.exigirVerNominaDe(tenantId, n.getEmpleadoId()); // el trabajador puede ver el suyo
        PeriodoNomina p = periodoRepository.findByTenantIdAndId(tenantId, n.getPeriodoId())
            .orElseThrow(() -> new RuntimeException("Período no encontrado"));
        Empleado e = empleadoRepository.findByTenantIdAndId(tenantId, n.getEmpleadoId())
            .orElseThrow(() -> new RuntimeException("Trabajador no encontrado"));
        AsignacionEmpleado a = asignacionRepository.findById(n.getAsignacionEmpleadoId()).filter(x -> tenantId.equals(x.getTenantId())).orElse(null);
        String cargo = a == null ? null : cargoRepository.findByTenantIdAndId(tenantId, a.getCargoId()).map(Cargo::getNombre).orElse(null);
        var lic = licenciaRepository.findByTenantId(tenantId).orElse(null);
        List<LineaRecibo> lineas = detalleRepository.findByTenantIdAndNominaEmpleadoId(tenantId, n.getId()).stream()
            .sorted(Comparator.comparing((DetalleNomina d) -> d.getTipo().ordinal()).thenComparing(DetalleNomina::getId))
            .map(d -> new LineaRecibo(d.getDescripcion(), d.getTipo().name(), d.getMontoTotal())).toList();
        return new ReciboImprimible(n.getId(), n.getEstado().name(),
            lic == null ? null : lic.getNombreEmpresa(), lic == null ? null : lic.getRazonSocial(),
            lic == null ? null : lic.getRif(), lic == null ? null : lic.getDomicilioFiscal(), lic == null ? null : lic.getTelefonoContacto(),
            e.getNombreCompleto(), e.getDocumentoIdentidad(), cargo,
            a == null ? null : a.getTipoSalario().name(), a == null ? null : MotorNominaService.frecuenciaDe(a),
            p.getNombre(), p.getFechaInicio(), p.getFechaFin(), n.getFechaPago(),
            n.getDiasTrabajados(), n.getHorasMarcadas(), n.getMoneda(), lineas,
            n.getTotalAsignaciones(), n.getTotalDeducciones(), n.getNetoAPagar(),
            ajusteService.calcularNetoEfectivo(tenantId, n), n.getNota());
    }

    static String nombrePeriodo(String frecuencia, LocalDate desde, LocalDate hasta) {
        String rango = desde.format(FMT) + " al " + hasta.format(FMT);
        return switch (frecuencia) {
            case "SEMANAL" -> "Semana del " + rango;
            case "QUINCENAL" -> "Quincena del " + rango;
            default -> "Mes del " + rango;
        };
    }
}
