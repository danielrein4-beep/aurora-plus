package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.RegistroOrdeno;
import com.auroraplus.modules.ganaderia.entities.TanqueLeche;
import com.auroraplus.modules.ganaderia.entities.VentaLecheTanque;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.RegistroOrdenoRepository;
import com.auroraplus.modules.ganaderia.repositories.TanqueLecheRepository;
import com.auroraplus.modules.ganaderia.repositories.VentaLecheTanqueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Leche de la finca: ordeños por vaca y turno, el tanque de frío (stock y calibración),
 * los despachos a planta o cisterna con su ingreso a caja, y los reportes de producción.
 * El controlador solo resuelve la finca, los roles y la auditoría.
 */
@Service
public class GanaderiaLecheService {

    private static final Set<String> TURNOS = Set.of("MANANA", "TARDE");
    private static final Set<String> DESTINOS = Set.of("TANQUE", "VENTA_DIRECTA", "DESCARTE");
    private static final Set<String> MONEDAS = Set.of("USD", "VES", "COP");

    @Autowired private RegistroOrdenoRepository registroOrdenoRepository;
    @Autowired private AnimalRepository animalRepository;
    @Autowired private TanqueLecheRepository tanqueLecheRepository;
    @Autowired private VentaLecheTanqueRepository ventaLecheTanqueRepository;
    @Autowired private MotorFinancieroService motorFinancieroService;
    @Autowired private GanaderiaSanidadService ganaderiaSanidadService;

    /** Datos de un ordeño (lo que manda la pantalla). */
    public static class DatosOrdeno {
        public Long animalId;
        public LocalDate fecha;
        public String turno;
        public BigDecimal cantidadLitros;
        public BigDecimal precioVentaLitro; // opcional — sin esto, el registro solo cuenta producción, no ingreso
        public BigDecimal porcentajeGrasa;
        public BigDecimal porcentajeProteina;
        public String destino; // "TANQUE" (default), "VENTA_DIRECTA" o "DESCARTE"
    }

    /** Datos de un despacho de leche del tanque. */
    public static class DatosDespacho {
        public LocalDate fecha;
        public BigDecimal litrosVendidos;
        public BigDecimal precioLitroUSD;
        public String compradorOPlanta;
        public String monedaPago; // opcional, default USD
        /** Monto físico recibido cuando se cobra en una moneda distinta a la base. */
        public BigDecimal montoRecibido;
        public String notas;
    }

    /** Calibración del tanque. */
    public static class DatosCalibracion {
        public BigDecimal capacidadLitros;
        public BigDecimal temperaturaCelsius;
        public BigDecimal stockAjuste;
    }

    /** Error de datos del despacho: el controlador lo devuelve como 400 con el mensaje tal cual. */
    public static class DespachoInvalido extends RuntimeException {
        public DespachoInvalido(String mensaje) { super(mensaje); }
    }

    // ───────────────────────────── Ordeño ─────────────────────────────

    @Transactional
    public RegistroOrdeno registrarOrdeno(Long tenantId, DatosOrdeno d) {
        if (d.animalId == null) {
            throw new RuntimeException("Debe indicar el animal ordeñado");
        }
        Animal animal = animalRepository.findForUpdateByIdAndTenantId(d.animalId, tenantId)
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        if (d.cantidadLitros == null || d.cantidadLitros.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("La cantidad de litros debe ser mayor a cero");
        }
        if (!"ACTIVO".equals(animal.getEstado()) || !"HEMBRA".equals(animal.getSexo()) || !"ORDEÑO".equals(animal.getEstadoProductivo())) {
            throw new RuntimeException("Solo se puede registrar ordeño para una hembra activa marcada 'En Ordeño'");
        }
        String turno = d.turno == null ? "" : d.turno.trim().toUpperCase();
        if (!TURNOS.contains(turno)) {
            throw new RuntimeException("Turno de ordeño no válido. Use MANANA o TARDE");
        }
        LocalDate fecha = d.fecha != null ? d.fecha : LocalDate.now();
        if (registroOrdenoRepository.existsByTenantIdAndAnimalIdAndFechaAndTurno(tenantId, animal.getId(), fecha, turno)) {
            throw new RuntimeException("Ya existe un ordeño para " + animal.getArete() + " en el turno " + turno + " de " + fecha);
        }
        String destino = d.destino != null && !d.destino.trim().isEmpty() ? d.destino.trim().toUpperCase() : "TANQUE";
        if (!DESTINOS.contains(destino)) {
            throw new IllegalArgumentException("Destino de ordeño no válido. Use TANQUE, VENTA_DIRECTA o DESCARTE");
        }
        if (!"DESCARTE".equals(destino)) {
            ganaderiaSanidadService.validarAptoParaTanqueOVentaLeche(animal.getId());
        }

        RegistroOrdeno registro = new RegistroOrdeno();
        registro.setTenantId(tenantId);
        registro.setAnimal(animal);
        // Snapshot del grupo de ordeño ACTUAL del animal — si más adelante se reasigna a otro
        // grupo, este registro histórico no cambia (ver RegistroOrdeno.grupoOrdeno).
        registro.setGrupoOrdeno(animal.getGrupoOrdeno());
        registro.setFecha(fecha);
        registro.setTurno(turno);
        registro.setCantidadLitros(d.cantidadLitros);
        registro.setPrecioVentaLitro(d.precioVentaLitro);
        registro.setPorcentajeGrasa(d.porcentajeGrasa);
        registro.setPorcentajeProteina(d.porcentajeProteina);
        registro.setDestino(destino);
        RegistroOrdeno guardado = registroOrdenoRepository.save(registro);

        if ("TANQUE".equals(destino)) {
            sumarAlTanque(tenantId, d.cantidadLitros);
        }
        return guardado;
    }

    /** Suma litros al tanque (lo crea si la finca aún no tiene); falla si supera la capacidad. */
    private void sumarAlTanque(Long tenantId, BigDecimal litros) {
        TanqueLeche tanque = tanqueLecheRepository.findForUpdateByTenantId(tenantId)
            .orElseGet(() -> tanqueNuevo(tenantId));
        BigDecimal nuevoStock = tanque.getStockActualLitros().add(litros);
        if (tanque.getCapacidadLitros() != null && nuevoStock.compareTo(tanque.getCapacidadLitros()) > 0) {
            throw new RuntimeException("El tanque no tiene capacidad: " + tanque.getStockActualLitros() + " L actuales + "
                + litros + " L supera " + tanque.getCapacidadLitros() + " L");
        }
        tanque.setStockActualLitros(nuevoStock);
        tanque.setUltimaActualizacion(LocalDateTime.now());
        tanqueLecheRepository.save(tanque);
    }

    private static TanqueLeche tanqueNuevo(Long tenantId) {
        TanqueLeche nuevo = new TanqueLeche();
        nuevo.setTenantId(tenantId);
        nuevo.setStockActualLitros(BigDecimal.ZERO);
        nuevo.setCapacidadLitros(BigDecimal.valueOf(2000.00));
        nuevo.setTemperaturaCelsius(BigDecimal.valueOf(4.0));
        return nuevo;
    }

    @Transactional(readOnly = true)
    public List<RegistroOrdeno> historialAnimal(Long tenantId, Long animalId) {
        animalRepository.findById(animalId).filter(a -> tenantId.equals(a.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        return registroOrdenoRepository.findByAnimalIdOrderByFechaDesc(animalId);
    }

    /** Producción total del hato en un rango de fechas. */
    @Transactional(readOnly = true)
    public Map<String, Object> reporte(Long tenantId, LocalDate desde, LocalDate hasta) {
        List<RegistroOrdeno> registros = registroOrdenoRepository.findByTenantIdAndFechaBetween(tenantId, desde, hasta);
        Map<String, Object> resultado = new LinkedHashMap<>();
        resultado.put("desde", desde);
        resultado.put("hasta", hasta);
        resultado.put("totalLitros", sumaLitros(registros));
        resultado.put("totalIngresos", sumaIngresos(registros));
        resultado.put("cantidadRegistros", registros.size());
        resultado.put("registros", registros);
        return resultado;
    }

    /** Producción e ingreso agrupados por DIA, SEMANA (ISO) o MES. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> ingresosPeriodo(Long tenantId, LocalDate desde, LocalDate hasta, String agrupacion) {
        List<RegistroOrdeno> registros = registroOrdenoRepository.findByTenantIdAndFechaBetween(tenantId, desde, hasta);
        Map<String, List<RegistroOrdeno>> porPeriodo = new TreeMap<>();
        for (RegistroOrdeno r : registros) {
            String clave = switch (agrupacion.toUpperCase()) {
                case "MES" -> r.getFecha().getYear() + "-" + String.format("%02d", r.getFecha().getMonthValue());
                case "SEMANA" -> {
                    java.time.temporal.WeekFields wf = java.time.temporal.WeekFields.ISO;
                    yield r.getFecha().get(wf.weekBasedYear()) + "-S" + String.format("%02d", r.getFecha().get(wf.weekOfWeekBasedYear()));
                }
                default -> r.getFecha().toString();
            };
            porPeriodo.computeIfAbsent(clave, k -> new ArrayList<>()).add(r);
        }
        List<Map<String, Object>> resultado = new ArrayList<>();
        for (Map.Entry<String, List<RegistroOrdeno>> e : porPeriodo.entrySet()) {
            Map<String, Object> fila = new LinkedHashMap<>();
            fila.put("periodo", e.getKey());
            fila.put("totalLitros", sumaLitros(e.getValue()));
            fila.put("totalIngresos", sumaIngresos(e.getValue()));
            fila.put("cantidadRegistros", e.getValue().size());
            resultado.add(fila);
        }
        return resultado;
    }

    private static BigDecimal sumaLitros(List<RegistroOrdeno> registros) {
        return registros.stream().map(RegistroOrdeno::getCantidadLitros)
            .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal sumaIngresos(List<RegistroOrdeno> registros) {
        return registros.stream().map(RegistroOrdeno::getMontoVenta).filter(Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
    }

    // ───────────────────────────── Tanque ─────────────────────────────

    /** El tanque de la finca; si aún no existe se crea vacío con 2000 L y 4 °C. */
    @Transactional
    public TanqueLeche obtenerTanque(Long tenantId) {
        return tanqueLecheRepository.findByTenantId(tenantId).orElseGet(() -> {
            TanqueLeche nuevo = tanqueNuevo(tenantId);
            nuevo.setUltimaActualizacion(LocalDateTime.now());
            return tanqueLecheRepository.save(nuevo);
        });
    }

    @Transactional
    public TanqueLeche calibrarTanque(Long tenantId, DatosCalibracion d) {
        TanqueLeche tanque = tanqueLecheRepository.findByTenantId(tenantId).orElseGet(() -> {
            TanqueLeche nuevo = new TanqueLeche();
            nuevo.setTenantId(tenantId);
            nuevo.setStockActualLitros(BigDecimal.ZERO);
            return nuevo;
        });
        if (d.capacidadLitros != null && d.capacidadLitros.compareTo(BigDecimal.ZERO) > 0) {
            tanque.setCapacidadLitros(d.capacidadLitros);
        }
        if (d.temperaturaCelsius != null) {
            tanque.setTemperaturaCelsius(d.temperaturaCelsius);
        }
        if (d.stockAjuste != null && d.stockAjuste.compareTo(BigDecimal.ZERO) >= 0) {
            tanque.setStockActualLitros(d.stockAjuste);
        }
        tanque.setUltimaActualizacion(LocalDateTime.now());
        return tanqueLecheRepository.save(tanque);
    }

    // ───────────────────────────── Despachos ─────────────────────────────

    /**
     * Despacho de leche del tanque: descuenta el stock, registra la venta y la ingresa a caja
     * en la moneda física del cobro. Devuelve tanque, venta e id del movimiento de caja.
     */
    @Transactional
    public Map<String, Object> despachar(Long tenantId, DatosDespacho d) {
        if (d.litrosVendidos == null || d.litrosVendidos.compareTo(BigDecimal.ZERO) <= 0) {
            throw new DespachoInvalido("Los litros a despachar deben ser mayores a cero");
        }
        if (d.precioLitroUSD == null || d.precioLitroUSD.compareTo(BigDecimal.ZERO) < 0) {
            throw new DespachoInvalido("El precio por litro no puede ser negativo");
        }
        if (d.compradorOPlanta == null || d.compradorOPlanta.trim().isEmpty()) {
            throw new DespachoInvalido("Debe indicar el comprador o planta receptora");
        }
        String monedaPago = d.monedaPago != null && !d.monedaPago.trim().isEmpty() ? d.monedaPago.trim().toUpperCase() : "USD";
        if (!MONEDAS.contains(monedaPago)) {
            throw new DespachoInvalido("Moneda de pago no admitida: " + monedaPago);
        }
        String monedaBase = motorFinancieroService.obtenerMonedaBase(tenantId);
        if (!monedaPago.equals(monedaBase) && d.montoRecibido == null && !"USD".equals(monedaPago)) {
            throw new DespachoInvalido("Indique el monto recibido en " + monedaPago
                + " para registrar una venta cobrada fuera de la moneda base");
        }

        TanqueLeche tanque = tanqueLecheRepository.findForUpdateByTenantId(tenantId).orElseGet(() -> {
            TanqueLeche nuevo = new TanqueLeche();
            nuevo.setTenantId(tenantId);
            nuevo.setStockActualLitros(BigDecimal.ZERO);
            return tanqueLecheRepository.save(nuevo);
        });
        if (tanque.getStockActualLitros().compareTo(d.litrosVendidos) < 0) {
            throw new DespachoInvalido("Stock insuficiente en tanque. Stock actual: " + tanque.getStockActualLitros()
                + " L, intentando despachar: " + d.litrosVendidos + " L");
        }
        tanque.setStockActualLitros(tanque.getStockActualLitros().subtract(d.litrosVendidos));
        tanque.setUltimaActualizacion(LocalDateTime.now());
        tanqueLecheRepository.save(tanque);

        VentaLecheTanque venta = new VentaLecheTanque();
        venta.setTenantId(tenantId);
        venta.setFecha(d.fecha != null ? d.fecha : LocalDate.now());
        venta.setLitrosVendidos(d.litrosVendidos);
        venta.setPrecioLitroUSD(d.precioLitroUSD);
        venta.setTotalUSD(d.litrosVendidos.multiply(d.precioLitroUSD).setScale(2, RoundingMode.HALF_UP));
        venta.setCompradorOPlanta(d.compradorOPlanta.trim());
        venta.setMonedaPago(monedaPago);
        venta.setNotas(d.notas);
        venta = ventaLecheTanqueRepository.save(venta);

        // El despacho confirma una venta: entra a caja en la moneda física del cobro.
        BigDecimal totalBase = "USD".equals(monedaBase)
            ? venta.getTotalUSD()
            : motorFinancieroService.convertirMoneda(tenantId, venta.getTotalUSD(), "USD", monedaBase);
        BigDecimal montoRecibido = d.montoRecibido;
        if (!venta.getMonedaPago().equals(monedaBase) && montoRecibido == null && "USD".equals(venta.getMonedaPago())) {
            montoRecibido = venta.getTotalUSD();
        }
        MovimientoCaja ingreso = motorFinancieroService.registrarMovimientoMultiMoneda(
            tenantId, MovimientoCaja.TipoMovimiento.INGRESO, totalBase, venta.getMonedaPago(), montoRecibido,
            "Venta de leche a " + venta.getCompradorOPlanta(), "GANADERIA", "VentaLecheTanque", venta.getId());
        venta.setMovimientoCajaId(ingreso.getId());
        venta = ventaLecheTanqueRepository.save(venta);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("tanque", tanque);
        resp.put("venta", venta);
        resp.put("ingresoCajaId", ingreso.getId());
        resp.put("mensaje", "Despacho de leche registrado y stock descontado exitosamente");
        return resp;
    }

    @Transactional(readOnly = true)
    public List<VentaLecheTanque> ventas(Long tenantId) {
        return ventaLecheTanqueRepository.findByTenantIdOrderByFechaDesc(tenantId);
    }

    /** Un despacho de la finca; nunca el de otra. */
    @Transactional(readOnly = true)
    public VentaLecheTanque despachoDeLaFinca(Long tenantId, Long id) {
        return ventaLecheTanqueRepository.findById(id)
            .filter(v -> tenantId != null && tenantId.equals(v.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Despacho no encontrado"));
    }
}
