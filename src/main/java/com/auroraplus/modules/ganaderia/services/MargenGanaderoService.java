package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.core.personal.entities.NominaEmpleado;
import com.auroraplus.core.personal.entities.PeriodoNomina;
import com.auroraplus.core.personal.repositories.NominaEmpleadoRepository;
import com.auroraplus.core.personal.repositories.PeriodoNominaRepository;
import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.AplicacionMedicamento;
import com.auroraplus.modules.ganaderia.entities.AplicacionVacuna;
import com.auroraplus.modules.ganaderia.entities.BajaAnimal;
import com.auroraplus.modules.ganaderia.entities.CompraAnimal;
import com.auroraplus.modules.ganaderia.entities.DetalleCompraAnimal;
import com.auroraplus.modules.ganaderia.entities.DetalleVentaAnimal;
import com.auroraplus.modules.ganaderia.entities.GastoGanaderia;
import com.auroraplus.modules.ganaderia.entities.MovimientoPotrero;
import com.auroraplus.modules.ganaderia.entities.RegistroConsumo;
import com.auroraplus.modules.ganaderia.entities.RegistroPeso;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.AplicacionMedicamentoRepository;
import com.auroraplus.modules.ganaderia.repositories.AplicacionVacunaRepository;
import com.auroraplus.modules.ganaderia.repositories.BajaAnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.CompraAnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.DetalleVentaAnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.GastoGanaderiaRepository;
import com.auroraplus.modules.ganaderia.repositories.MovimientoPotreroRepository;
import com.auroraplus.modules.ganaderia.repositories.RegistroConsumoRepository;
import com.auroraplus.modules.ganaderia.repositories.RegistroPesoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Predicate;

/**
 * Margen por animal y por lote: lo que cuesta cada animal desde que entra a la finca hasta que
 * sale (o hasta hoy) contra lo que deja su venta.
 *
 * <p>Costos DIRECTOS: compra, vacunas y medicamentos aplicados a él, el alimento y la sal mineral
 * que se consumió en el potrero donde estaba ese día (repartido entre los animales del potrero) y
 * los gastos de alimentación/sanidad de la finca (de su lote si el gasto trae lote, si no de todo
 * el hato). Costos INDIRECTOS: la nómina de los obreros y los gastos generales (mantenimiento,
 * maquinaria, fletes, servicios), repartidos por día-animal entre los que estaban en la finca.
 *
 * <p>Un animal activo se valoriza con su peso actual por el precio por kilo (proyectado); uno
 * muerto o robado no deja ingreso y su costo es pérdida.
 */
@Service
public class MargenGanaderoService {

    /** Sin ninguna fecha conocida se asume que el animal estaba desde siempre. */
    private static final LocalDate DESDE_SIEMPRE = LocalDate.of(2000, 1, 1);
    private static final Set<String> NOMINA_VALIDA = Set.of("APROBADA", "PAGADA");

    @Autowired private AnimalRepository animalRepository;
    @Autowired private AplicacionVacunaRepository aplicacionVacunaRepository;
    @Autowired private AplicacionMedicamentoRepository aplicacionMedicamentoRepository;
    @Autowired private DetalleVentaAnimalRepository detalleVentaAnimalRepository;
    @Autowired private BajaAnimalRepository bajaAnimalRepository;
    @Autowired private CompraAnimalRepository compraAnimalRepository;
    @Autowired private RegistroPesoRepository registroPesoRepository;
    @Autowired private MovimientoPotreroRepository movimientoPotreroRepository;
    @Autowired private RegistroConsumoRepository registroConsumoRepository;
    @Autowired private GastoGanaderiaRepository gastoGanaderiaRepository;
    @Autowired private PeriodoNominaRepository periodoNominaRepository;
    @Autowired private NominaEmpleadoRepository nominaEmpleadoRepository;
    @Autowired private MotorFinancieroService motorFinancieroService;

    public static class MargenAnimal {
        public Long animalId;
        public String arete;
        public String nombre;
        public String tipoAnimal;
        public String lote;
        public String estado;
        public LocalDate entrada;
        public LocalDate salida;
        public long dias;
        public BigDecimal pesoActual;
        public BigDecimal adquisicion = BigDecimal.ZERO;
        public BigDecimal vacunas = BigDecimal.ZERO;
        public BigDecimal medicamentos = BigDecimal.ZERO;
        public BigDecimal sanidadGeneral = BigDecimal.ZERO;
        public BigDecimal alimentacion = BigDecimal.ZERO;
        public BigDecimal costoDirecto;
        public BigDecimal manoDeObra = BigDecimal.ZERO;
        public BigDecimal gastosGenerales = BigDecimal.ZERO;
        public BigDecimal costoIndirecto;
        public BigDecimal costoTotal;
        /** VENTA, PROYECTADO, BAJA (muerte o robo: sin ingreso) o SIN_VALORAR (activo sin peso o sin precio). */
        public String tipoIngreso;
        public BigDecimal ingreso;
        public BigDecimal margenBruto;
        public BigDecimal margenNeto;
    }

    public static class MargenLote {
        public String lote;
        public int animales;
        public int vendidos;
        public int bajas;
        public int sinValorar;
        public BigDecimal adquisicion = BigDecimal.ZERO;
        public BigDecimal sanidad = BigDecimal.ZERO;
        public BigDecimal alimentacion = BigDecimal.ZERO;
        public BigDecimal costoDirecto = BigDecimal.ZERO;
        public BigDecimal costoIndirecto = BigDecimal.ZERO;
        public BigDecimal costoTotal = BigDecimal.ZERO;
        public BigDecimal ingreso = BigDecimal.ZERO;
        /** Solo de los animales valorados (vendidos, proyectados y bajas). */
        public BigDecimal margenBruto = BigDecimal.ZERO;
        public BigDecimal margenNeto = BigDecimal.ZERO;
        public BigDecimal margenPorAnimal;
    }

    public static class Resultado {
        public LocalDate fechaCorte;
        public String monedaBase;
        public String alcance;
        public BigDecimal precioKg;
        public BigDecimal precioKgSugerido;
        public List<MargenAnimal> animales = new ArrayList<>();
        public List<MargenLote> lotes = new ArrayList<>();
        public MargenLote totales;
        public List<String> notas = new ArrayList<>();
    }

    /** Día-animal: un animal presente en la finca entre dos fechas (inclusive). */
    private static final class Estadia {
        final Animal animal;
        final MargenAnimal margen;
        final LocalDate entrada;
        final LocalDate salida;
        final List<MovimientoPotrero> movimientos;

        Estadia(Animal animal, MargenAnimal margen, LocalDate entrada, LocalDate salida, List<MovimientoPotrero> movimientos) {
            this.animal = animal;
            this.margen = margen;
            this.entrada = entrada;
            this.salida = salida;
            this.movimientos = movimientos;
        }

        long diasEn(LocalDate desde, LocalDate hasta) {
            LocalDate a = desde.isAfter(entrada) ? desde : entrada;
            LocalDate b = hasta.isBefore(salida) ? hasta : salida;
            return a.isAfter(b) ? 0 : ChronoUnit.DAYS.between(a, b) + 1;
        }

        /** Potrero donde estaba ese día según el kardex de rotaciones. */
        Long potreroEn(LocalDate dia) {
            if (movimientos.isEmpty()) return animal.getPotrero() != null ? animal.getPotrero().getId() : null;
            MovimientoPotrero ultimo = null;
            for (MovimientoPotrero m : movimientos) {
                if (m.getFechaRegistro().toLocalDate().isAfter(dia)) break;
                ultimo = m;
            }
            if (ultimo != null) return ultimo.getPotreroDestino() != null ? ultimo.getPotreroDestino().getId() : null;
            MovimientoPotrero primero = movimientos.get(0);
            return primero.getPotreroOrigen() != null ? primero.getPotreroOrigen().getId() : null;
        }
    }

    private interface Asignar {
        void a(MargenAnimal m, BigDecimal monto);
    }

    @Transactional(readOnly = true)
    public Resultado calcular(Long tenantId, BigDecimal precioKg, String alcance) {
        LocalDate hoy = LocalDate.now();
        Resultado r = new Resultado();
        r.fechaCorte = hoy;
        r.monedaBase = motorFinancieroService.obtenerMonedaBase(tenantId);
        r.alcance = alcance == null ? "TODOS" : alcance.toUpperCase();

        List<Animal> animales = animalRepository.findByTenantId(tenantId);

        // ── Fechas de entrada y salida ──
        Map<Long, DetalleVentaAnimal> ventas = new HashMap<>();
        for (DetalleVentaAnimal d : detalleVentaAnimalRepository.findByTenantId(tenantId)) {
            if (d.getAnimal() != null) ventas.put(d.getAnimal().getId(), d);
        }
        Map<Long, LocalDate> bajas = new HashMap<>();
        for (BajaAnimal b : bajaAnimalRepository.findByTenantId(tenantId)) {
            if (b.getAnimal() != null) bajas.put(b.getAnimal().getId(), b.getFecha());
        }
        Map<Long, LocalDate> compras = new HashMap<>();
        for (CompraAnimal c : compraAnimalRepository.findByTenantIdOrderByFechaCompraDesc(tenantId)) {
            for (DetalleCompraAnimal d : c.getItems()) {
                if (d.getAnimal() != null && c.getFechaCompra() != null) compras.put(d.getAnimal().getId(), c.getFechaCompra().toLocalDate());
            }
        }
        Map<Long, LocalDate> primerPeso = new HashMap<>();
        for (RegistroPeso p : registroPesoRepository.findByTenantIdOrdenado(tenantId)) {
            primerPeso.merge(p.getAnimal().getId(), p.getFecha(), (x, y) -> x.isBefore(y) ? x : y);
        }
        Map<Long, List<MovimientoPotrero>> movimientos = new HashMap<>();
        for (MovimientoPotrero m : movimientoPotreroRepository.findByTenantId(tenantId)) {
            if (m.getAnimal() != null && m.getFechaRegistro() != null) {
                movimientos.computeIfAbsent(m.getAnimal().getId(), k -> new ArrayList<>()).add(m);
            }
        }
        movimientos.values().forEach(l -> l.sort(Comparator.comparing(MovimientoPotrero::getFechaRegistro)));

        List<AplicacionVacuna> vacunas = aplicacionVacunaRepository.findByTenantId(tenantId);
        List<AplicacionMedicamento> medicamentos = aplicacionMedicamentoRepository.findByTenantId(tenantId);

        Map<Long, Estadia> estadias = new LinkedHashMap<>();
        for (Animal a : animales) {
            MargenAnimal m = new MargenAnimal();
            m.animalId = a.getId();
            m.arete = a.getArete();
            m.nombre = a.getNombre();
            m.tipoAnimal = a.getTipoAnimal();
            m.lote = a.getLote() != null && !a.getLote().isBlank() ? a.getLote().trim() : null;
            m.estado = a.getEstado();
            m.pesoActual = a.getPesoActual();
            m.adquisicion = nz(a.getCostoAdquisicion());

            LocalDate entrada;
            if (compras.containsKey(a.getId())) {
                entrada = compras.get(a.getId());
            } else if (m.adquisicion.signum() > 0 && primerPeso.containsKey(a.getId())) {
                entrada = primerPeso.get(a.getId()); // comprado e importado: su primer pesaje es el de ingreso
            } else if (a.getFechaNacimiento() != null) {
                entrada = a.getFechaNacimiento();
            } else {
                entrada = primerPeso.getOrDefault(a.getId(), DESDE_SIEMPRE);
            }
            LocalDate salida = hoy;
            DetalleVentaAnimal venta = ventas.get(a.getId());
            if (venta != null && venta.getVenta() != null && venta.getVenta().getFecha() != null) {
                salida = venta.getVenta().getFecha().toLocalDate();
            } else if (bajas.containsKey(a.getId()) && bajas.get(a.getId()) != null) {
                salida = bajas.get(a.getId());
            }
            if (entrada.isAfter(salida)) entrada = salida;
            m.entrada = DESDE_SIEMPRE.equals(entrada) ? null : entrada;
            m.salida = salida;
            m.dias = DESDE_SIEMPRE.equals(entrada) ? 0 : ChronoUnit.DAYS.between(entrada, salida) + 1;
            estadias.put(a.getId(), new Estadia(a, m, entrada, salida, movimientos.getOrDefault(a.getId(), List.of())));
        }

        // ── Sanidad aplicada a cada animal ──
        boolean costeaPorAplicacion = false;
        for (AplicacionVacuna v : vacunas) {
            Estadia e = v.getAnimal() != null ? estadias.get(v.getAnimal().getId()) : null;
            if (e != null && v.getCosto() != null) {
                e.margen.vacunas = e.margen.vacunas.add(v.getCosto());
                costeaPorAplicacion |= v.getCosto().signum() > 0;
            }
        }
        for (AplicacionMedicamento v : medicamentos) {
            Estadia e = v.getAnimal() != null ? estadias.get(v.getAnimal().getId()) : null;
            if (e != null && v.getCosto() != null) {
                e.margen.medicamentos = e.margen.medicamentos.add(v.getCosto());
                costeaPorAplicacion |= v.getCosto().signum() > 0;
            }
        }

        // ── Alimento y sal mineral consumidos en cada potrero ──
        BigDecimal consumoSinAnimales = BigDecimal.ZERO;
        for (RegistroConsumo c : registroConsumoRepository.findByTenantId(tenantId)) {
            BigDecimal costo = nz(c.getCantidad()).multiply(c.getInsumo() != null ? nz(c.getInsumo().getCostoUnitario()) : BigDecimal.ZERO);
            if (costo.signum() <= 0 || c.getFecha() == null) continue;
            Long potreroId = c.getPotrero() != null ? c.getPotrero().getId() : null;
            LocalDate dia = c.getFecha();
            boolean repartido = repartir(estadias.values(), dia, dia, costo,
                e -> potreroId != null && potreroId.equals(e.potreroEn(dia)),
                (m, monto) -> m.alimentacion = m.alimentacion.add(monto));
            if (!repartido) {
                // Nadie figuraba en ese potrero ese día: el alimento igual se gastó, lo absorbe el hato.
                if (!repartir(estadias.values(), dia, dia, costo, e -> true, (m, monto) -> m.alimentacion = m.alimentacion.add(monto))) {
                    consumoSinAnimales = consumoSinAnimales.add(costo);
                }
            }
        }

        // ── Nómina de los obreros ──
        List<PeriodoNomina> periodos = periodoNominaRepository.findByTenantId(tenantId).stream()
            .filter(p -> p.getEstado() != null && NOMINA_VALIDA.contains(p.getEstado().name()))
            .filter(p -> p.getFechaInicio() != null && p.getFechaFin() != null)
            .toList();
        boolean hayNomina = false;
        int nominasSinTasa = 0;
        for (PeriodoNomina p : periodos) {
            BigDecimal costoPeriodo = BigDecimal.ZERO;
            for (NominaEmpleado n : nominaEmpleadoRepository.findByTenantIdAndPeriodoId(tenantId, p.getId())) {
                if (n.getEstado() != null && "REVERSADA".equals(n.getEstado().name())) continue;
                // Costo para la finca: lo devengado más los aportes patronales.
                BigDecimal costo = nz(n.getTotalAsignaciones()).add(nz(n.getTotalAportesPatronales()));
                if (n.getMoneda() != null && !n.getMoneda().equals(r.monedaBase)) {
                    if (n.getTasaAplicada() == null || n.getTasaAplicada().signum() <= 0) {
                        nominasSinTasa++;
                        continue;
                    }
                    costo = costo.multiply(n.getTasaAplicada());
                }
                costoPeriodo = costoPeriodo.add(costo);
            }
            if (costoPeriodo.signum() <= 0) continue;
            hayNomina = true;
            repartir(estadias.values(), p.getFechaInicio(), p.getFechaFin(), costoPeriodo, e -> true,
                (m, monto) -> m.manoDeObra = m.manoDeObra.add(monto));
        }

        // ── Gastos de la finca ──
        BigDecimal sanidadExcluida = BigDecimal.ZERO;
        BigDecimal manoDeObraExcluida = BigDecimal.ZERO;
        for (GastoGanaderia g : gastoGanaderiaRepository.findByTenantIdOrderByFechaDesc(tenantId)) {
            BigDecimal monto = nz(g.getMonto());
            if (monto.signum() <= 0 || g.getFecha() == null) continue;
            String categoria = g.getCategoria() == null ? "OTROS" : g.getCategoria().toUpperCase();
            Asignar destino;
            switch (categoria) {
                case "ALIMENTACION" -> destino = (m, x) -> m.alimentacion = m.alimentacion.add(x);
                case "SANIDAD" -> {
                    // Si las vacunas y medicinas ya traen su costo por animal, la compra de esos
                    // mismos productos como gasto se contaría dos veces.
                    if (costeaPorAplicacion) {
                        sanidadExcluida = sanidadExcluida.add(monto);
                        continue;
                    }
                    destino = (m, x) -> m.sanidadGeneral = m.sanidadGeneral.add(x);
                }
                case "MANO_DE_OBRA" -> {
                    if (hayNomina) {
                        manoDeObraExcluida = manoDeObraExcluida.add(monto);
                        continue;
                    }
                    destino = (m, x) -> m.manoDeObra = m.manoDeObra.add(x);
                }
                default -> destino = (m, x) -> m.gastosGenerales = m.gastosGenerales.add(x);
            }
            String lote = g.getLote();
            LocalDate dia = g.getFecha();
            boolean repartido = lote != null && !lote.isBlank()
                && repartir(estadias.values(), dia, dia, monto, e -> lote.trim().equalsIgnoreCase(e.margen.lote), destino);
            if (!repartido) repartir(estadias.values(), dia, dia, monto, e -> true, destino);
        }

        // ── Ingreso: venta, o peso actual por precio del kilo ──
        r.precioKgSugerido = precioKgDeLasVentas(ventas.values(), hoy);
        r.precioKg = precioKg != null && precioKg.signum() > 0 ? precioKg : r.precioKgSugerido;
        for (Estadia e : estadias.values()) {
            MargenAnimal m = e.margen;
            m.costoDirecto = m.adquisicion.add(m.vacunas).add(m.medicamentos).add(m.sanidadGeneral).add(m.alimentacion);
            m.costoIndirecto = m.manoDeObra.add(m.gastosGenerales);
            m.costoTotal = m.costoDirecto.add(m.costoIndirecto);
            DetalleVentaAnimal venta = ventas.get(m.animalId);
            if (venta != null && venta.getPrecioVenta() != null) {
                m.tipoIngreso = "VENTA";
                m.ingreso = venta.getPrecioVenta();
            } else if ("MUERTO".equals(m.estado) || "ROBADO".equals(m.estado)) {
                m.tipoIngreso = "BAJA";
                m.ingreso = BigDecimal.ZERO;
            } else if (r.precioKg != null && m.pesoActual != null && m.pesoActual.signum() > 0) {
                m.tipoIngreso = "PROYECTADO";
                m.ingreso = m.pesoActual.multiply(r.precioKg);
            } else {
                m.tipoIngreso = "SIN_VALORAR";
            }
            if (m.ingreso != null) {
                m.margenBruto = m.ingreso.subtract(m.costoDirecto);
                m.margenNeto = m.ingreso.subtract(m.costoTotal);
            }
            redondear(m);
        }

        // ── Alcance y agrupación por lote ──
        Predicate<MargenAnimal> enAlcance = switch (r.alcance) {
            case "ACTIVOS" -> m -> !"VENTA".equals(m.tipoIngreso) && !"BAJA".equals(m.tipoIngreso);
            case "VENDIDOS" -> m -> "VENTA".equals(m.tipoIngreso);
            default -> m -> true;
        };
        Map<String, MargenLote> porLote = new LinkedHashMap<>();
        MargenLote totales = new MargenLote();
        totales.lote = "Total";
        estadias.values().stream().map(e -> e.margen).filter(enAlcance)
            .sorted(Comparator.comparing((MargenAnimal m) -> m.lote == null ? "￿" : m.lote.toLowerCase())
                .thenComparing(m -> m.arete == null ? "" : m.arete))
            .forEach(m -> {
                r.animales.add(m);
                String clave = m.lote == null ? "Sin lote" : m.lote;
                sumar(porLote.computeIfAbsent(clave, k -> {
                    MargenLote l = new MargenLote();
                    l.lote = k;
                    return l;
                }), m);
                sumar(totales, m);
            });
        porLote.values().forEach(MargenGanaderoService::cerrar);
        cerrar(totales);
        r.lotes.addAll(porLote.values());
        r.totales = totales;

        // ── Supuestos a la vista ──
        r.notas.add("Los costos indirectos (nómina y gastos generales) se reparten por día-animal entre los animales que estaban en la finca en esas fechas.");
        if (r.precioKg != null && r.animales.stream().anyMatch(m -> "PROYECTADO".equals(m.tipoIngreso))) {
            r.notas.add("Los animales activos se valorizan con su peso actual a " + monto(r.precioKg, r.monedaBase)
                + " el kilo; es un ingreso proyectado, no una venta.");
        }
        if (totales.sinValorar > 0) {
            r.notas.add(totales.sinValorar + " animal(es) activos sin peso o sin precio por kilo: se muestran sus costos pero no entran en el margen.");
        }
        if (sanidadExcluida.signum() > 0) {
            r.notas.add("Gastos de sanidad por " + monto(sanidadExcluida, r.monedaBase) + " no se repartieron: las vacunas y medicinas ya traen su costo en cada aplicación y se contarían dos veces.");
        }
        if (manoDeObraExcluida.signum() > 0) {
            r.notas.add("Gastos de mano de obra por " + monto(manoDeObraExcluida, r.monedaBase) + " no se repartieron: la mano de obra sale de la nómina aprobada.");
        }
        if (nominasSinTasa > 0) {
            r.notas.add(nominasSinTasa + " pago(s) de nómina en otra moneda sin tasa registrada quedaron fuera.");
        }
        if (consumoSinAnimales.signum() > 0) {
            r.notas.add("Consumo de alimento por " + monto(consumoSinAnimales, r.monedaBase) + " en fechas sin animales en la finca: no se asignó.");
        }
        return r;
    }

    /**
     * Reparte un monto entre los animales que cumplen el filtro, en proporción a los días que
     * estuvieron en la finca dentro del rango. Devuelve false si no había ninguno.
     */
    private static boolean repartir(Iterable<Estadia> estadias, LocalDate desde, LocalDate hasta, BigDecimal monto,
                                    Predicate<Estadia> filtro, Asignar asignar) {
        List<Estadia> elegidos = new ArrayList<>();
        List<Long> dias = new ArrayList<>();
        long total = 0;
        for (Estadia e : estadias) {
            long d = e.diasEn(desde, hasta);
            if (d > 0 && filtro.test(e)) {
                elegidos.add(e);
                dias.add(d);
                total += d;
            }
        }
        if (total == 0) return false;
        BigDecimal porDia = monto.divide(BigDecimal.valueOf(total), 10, RoundingMode.HALF_UP);
        for (int i = 0; i < elegidos.size(); i++) {
            asignar.a(elegidos.get(i).margen, porDia.multiply(BigDecimal.valueOf(dias.get(i))));
        }
        return true;
    }

    /** Precio por kilo de las ventas del último año (precio / peso del animal vendido). */
    private static BigDecimal precioKgDeLasVentas(Iterable<DetalleVentaAnimal> ventas, LocalDate hoy) {
        BigDecimal pesos = BigDecimal.ZERO, montos = BigDecimal.ZERO;
        for (DetalleVentaAnimal d : ventas) {
            if (d.getVenta() == null || d.getVenta().getFecha() == null || d.getPrecioVenta() == null) continue;
            if (d.getVenta().getFecha().toLocalDate().isBefore(hoy.minusYears(1))) continue;
            BigDecimal peso = d.getAnimal() != null ? d.getAnimal().getPesoActual() : null;
            if (peso == null || peso.signum() <= 0 || d.getPrecioVenta().signum() <= 0) continue;
            pesos = pesos.add(peso);
            montos = montos.add(d.getPrecioVenta());
        }
        return pesos.signum() > 0 ? montos.divide(pesos, 2, RoundingMode.HALF_UP) : null;
    }

    private static void sumar(MargenLote l, MargenAnimal m) {
        l.animales++;
        if ("VENTA".equals(m.tipoIngreso)) l.vendidos++;
        if ("BAJA".equals(m.tipoIngreso)) l.bajas++;
        if ("SIN_VALORAR".equals(m.tipoIngreso)) l.sinValorar++;
        l.adquisicion = l.adquisicion.add(m.adquisicion);
        l.sanidad = l.sanidad.add(m.vacunas).add(m.medicamentos).add(m.sanidadGeneral);
        l.alimentacion = l.alimentacion.add(m.alimentacion);
        l.costoDirecto = l.costoDirecto.add(m.costoDirecto);
        l.costoIndirecto = l.costoIndirecto.add(m.costoIndirecto);
        l.costoTotal = l.costoTotal.add(m.costoTotal);
        if (m.ingreso != null) {
            l.ingreso = l.ingreso.add(m.ingreso);
            l.margenBruto = l.margenBruto.add(m.margenBruto);
            l.margenNeto = l.margenNeto.add(m.margenNeto);
        }
    }

    private static void cerrar(MargenLote l) {
        int valorados = l.animales - l.sinValorar;
        l.margenPorAnimal = valorados > 0 ? l.margenNeto.divide(BigDecimal.valueOf(valorados), 2, RoundingMode.HALF_UP) : null;
    }

    private static void redondear(MargenAnimal m) {
        m.adquisicion = r2(m.adquisicion);
        m.vacunas = r2(m.vacunas);
        m.medicamentos = r2(m.medicamentos);
        m.sanidadGeneral = r2(m.sanidadGeneral);
        m.alimentacion = r2(m.alimentacion);
        m.costoDirecto = r2(m.costoDirecto);
        m.manoDeObra = r2(m.manoDeObra);
        m.gastosGenerales = r2(m.gastosGenerales);
        m.costoIndirecto = r2(m.costoIndirecto);
        m.costoTotal = r2(m.costoTotal);
        m.ingreso = m.ingreso == null ? null : r2(m.ingreso);
        m.margenBruto = m.margenBruto == null ? null : r2(m.margenBruto);
        m.margenNeto = m.margenNeto == null ? null : r2(m.margenNeto);
    }

    /** Monto con formato venezolano ($1.234,50), igual que en pantalla y en los PDF. */
    static String monto(BigDecimal v, String moneda) {
        java.text.DecimalFormatSymbols sym = new java.text.DecimalFormatSymbols(java.util.Locale.forLanguageTag("es-VE"));
        sym.setGroupingSeparator('.');
        sym.setDecimalSeparator(',');
        String cifra = new java.text.DecimalFormat("#,##0.00", sym).format(v.abs().setScale(2, RoundingMode.HALF_UP));
        String signo = v.signum() < 0 ? "-" : "";
        return moneda == null || "USD".equals(moneda) ? signo + "$" + cifra : signo + cifra + " " + moneda;
    }

    private static BigDecimal r2(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal nz(BigDecimal v) {
        return Objects.requireNonNullElse(v, BigDecimal.ZERO);
    }
}
