package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.BajaAnimal;
import com.auroraplus.modules.ganaderia.entities.EventoReproductivo;
import com.auroraplus.modules.ganaderia.entities.RegistroOrdeno;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.BajaAnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.EventoReproductivoRepository;
import com.auroraplus.modules.ganaderia.repositories.RegistroOrdenoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Indicadores de gestión del hato, los que mira un administrador ganadero:
 * preñez, natalidad, intervalo entre partos, días abiertos, mortalidad, leche por vaca y GDP.
 *
 * Cada indicador es null cuando no hay datos suficientes para calcularlo (nunca un valor supuesto),
 * y se acompaña de la base con que se calculó para que la pantalla pueda explicarlo.
 */
@Service
public class GanaderiaIndicadoresService {

    /** Gestación bovina promedio: sirve para estimar la fecha de concepción desde la fecha probable de parto. */
    static final int DIAS_GESTACION = 283;
    /** Dos crías de la misma madre con menos de esto entre sí son del mismo parto (gemelos), no dos partos. */
    static final int MIN_DIAS_ENTRE_PARTOS = 200;

    @Autowired private AnimalRepository animalRepository;
    @Autowired private BajaAnimalRepository bajaAnimalRepository;
    @Autowired private EventoReproductivoRepository eventoReproductivoRepository;
    @Autowired private RegistroOrdenoRepository registroOrdenoRepository;
    @Autowired private GanaderiaEngordeService engordeService;

    public static class Indicadores {
        /** Hembras en edad reproductiva: vacas y novillas activas. */
        public int hembrasReproductivas;
        public int prenadas;
        /** % de hembras reproductivas preñadas. */
        public BigDecimal porcentajePrenez;

        public int vacas;
        /** Crías nacidas en la finca (con madre registrada) en los últimos 12 meses. */
        public int nacimientos12Meses;
        /** % natalidad: nacimientos de 12 meses por cada 100 vacas. */
        public BigDecimal natalidad12Meses;

        /** Promedio de días entre partos consecutivos de la misma madre. */
        public Integer intervaloEntrePartosDias;
        public int intervalosMedidos;

        /** Promedio de días entre el último parto y la nueva concepción (preñadas con fecha de parto estimada). */
        public Integer diasAbiertos;
        public int diasAbiertosMedidos;

        public int muertes12Meses;
        /** % mortalidad de 12 meses sobre el hato expuesto (activos + muertos en el periodo). */
        public BigDecimal mortalidad12Meses;

        /** Litros promedio por vaca por día de ordeño en los últimos 30 días. */
        public BigDecimal litrosPorVacaDia;
        public int vacasOrdenadas30Dias;

        /** Ganancia diaria de peso promedio de los animales con dos pesajes o más. */
        public BigDecimal gdpPromedioKgDia;
        public int animalesConGdp;
    }

    @Transactional(readOnly = true)
    public Indicadores calcular(Long tenantId) {
        return calcular(tenantId, LocalDate.now());
    }

    @Transactional(readOnly = true)
    public Indicadores calcular(Long tenantId, LocalDate hoy) {
        Indicadores r = new Indicadores();
        List<Animal> todos = animalRepository.findByTenantId(tenantId);
        List<Animal> activos = todos.stream().filter(a -> "ACTIVO".equals(a.getEstado()) || a.getEstado() == null).toList();
        LocalDate haceUnAnio = hoy.minusDays(365);

        // Preñez
        List<Animal> reproductivas = activos.stream()
            .filter(a -> "HEMBRA".equals(a.getSexo()) && ("VACA".equals(a.getTipoAnimal()) || "NOVILLA".equals(a.getTipoAnimal())))
            .toList();
        r.hembrasReproductivas = reproductivas.size();
        r.prenadas = (int) reproductivas.stream().filter(a -> "PREÑADA".equals(a.getEstadoReproductivo())).count();
        r.porcentajePrenez = porcentaje(r.prenadas, r.hembrasReproductivas);

        // Natalidad: nacidos en la finca (tienen madre) en los últimos 12 meses, sin importar si siguen activos.
        r.vacas = (int) activos.stream().filter(a -> "HEMBRA".equals(a.getSexo()) && "VACA".equals(a.getTipoAnimal())).count();
        List<Animal> nacidosEnFinca = todos.stream()
            .filter(a -> a.getMadre() != null && a.getFechaNacimiento() != null && !a.getFechaNacimiento().isAfter(hoy))
            .toList();
        r.nacimientos12Meses = (int) nacidosEnFinca.stream().filter(a -> !a.getFechaNacimiento().isBefore(haceUnAnio)).count();
        r.natalidad12Meses = porcentaje(r.nacimientos12Meses, r.vacas);

        // Partos por madre (fechas de nacimiento de sus crías; gemelos cuentan como un parto).
        Map<Long, List<LocalDate>> partosPorMadre = new HashMap<>();
        for (Animal cria : nacidosEnFinca) {
            partosPorMadre.computeIfAbsent(cria.getMadre().getId(), k -> new ArrayList<>()).add(cria.getFechaNacimiento());
        }
        partosPorMadre.replaceAll((madre, fechas) -> partosDistintos(fechas));

        // Intervalo entre partos
        List<Long> intervalos = new ArrayList<>();
        for (List<LocalDate> partos : partosPorMadre.values()) {
            for (int i = 1; i < partos.size(); i++) {
                intervalos.add(ChronoUnit.DAYS.between(partos.get(i - 1), partos.get(i)));
            }
        }
        r.intervalosMedidos = intervalos.size();
        r.intervaloEntrePartosDias = promedioEntero(intervalos);

        // Días abiertos: del último parto a la concepción estimada (fecha probable de parto - gestación).
        Map<Long, EventoReproductivo> ultimaPrenez = new HashMap<>();
        for (EventoReproductivo e : eventoReproductivoRepository.findEventosPrenezActual(tenantId)) {
            if (e.getFechaProbableParto() != null) ultimaPrenez.putIfAbsent(e.getHembra().getId(), e);
        }
        List<Long> abiertos = new ArrayList<>();
        for (Map.Entry<Long, EventoReproductivo> p : ultimaPrenez.entrySet()) {
            List<LocalDate> partos = partosPorMadre.get(p.getKey());
            if (partos == null || partos.isEmpty()) continue;
            LocalDate ultimoParto = partos.get(partos.size() - 1);
            LocalDate concepcion = p.getValue().getFechaProbableParto().minusDays(DIAS_GESTACION);
            if (concepcion.isAfter(ultimoParto)) abiertos.add(ChronoUnit.DAYS.between(ultimoParto, concepcion));
        }
        r.diasAbiertosMedidos = abiertos.size();
        r.diasAbiertos = promedioEntero(abiertos);

        // Mortalidad de 12 meses
        List<BajaAnimal> bajas = bajaAnimalRepository.findByTenantId(tenantId);
        r.muertes12Meses = (int) bajas.stream().filter(b -> b.getFecha() != null && !b.getFecha().isBefore(haceUnAnio)).count();
        r.mortalidad12Meses = porcentaje(r.muertes12Meses, activos.size() + r.muertes12Meses);

        // Leche por vaca y día (30 días): litros / pares (vaca, día) con ordeño.
        List<RegistroOrdeno> ordenos = registroOrdenoRepository.findByTenantIdAndFechaBetween(tenantId, hoy.minusDays(29), hoy);
        Set<String> vacaDia = new HashSet<>();
        BigDecimal litros = BigDecimal.ZERO;
        for (RegistroOrdeno o : ordenos) {
            if (o.getCantidadLitros() == null || o.getAnimal() == null) continue;
            litros = litros.add(o.getCantidadLitros());
            vacaDia.add(o.getAnimal().getId() + "|" + o.getFecha());
        }
        r.vacasOrdenadas30Dias = (int) ordenos.stream().filter(o -> o.getAnimal() != null).map(o -> o.getAnimal().getId()).distinct().count();
        r.litrosPorVacaDia = vacaDia.isEmpty() ? null : litros.divide(BigDecimal.valueOf(vacaDia.size()), 1, java.math.RoundingMode.HALF_UP);

        // GDP promedio
        List<BigDecimal> gdps = engordeService.resumen(tenantId).stream()
            .map(f -> f.gdpKgDia).filter(Objects::nonNull).toList();
        r.animalesConGdp = gdps.size();
        r.gdpPromedioKgDia = gdps.isEmpty() ? null
            : gdps.stream().reduce(BigDecimal.ZERO, BigDecimal::add).divide(BigDecimal.valueOf(gdps.size()), 3, java.math.RoundingMode.HALF_UP);

        return r;
    }

    /** Fechas de parto ordenadas, uniendo las crías de un mismo parto (gemelos). */
    static List<LocalDate> partosDistintos(List<LocalDate> fechasCrias) {
        List<LocalDate> ordenadas = fechasCrias.stream().sorted().collect(Collectors.toList());
        List<LocalDate> partos = new ArrayList<>();
        for (LocalDate f : ordenadas) {
            if (partos.isEmpty() || ChronoUnit.DAYS.between(partos.get(partos.size() - 1), f) >= MIN_DIAS_ENTRE_PARTOS) {
                partos.add(f);
            }
        }
        return partos;
    }

    private static BigDecimal porcentaje(int parte, int total) {
        if (total <= 0) return null;
        return BigDecimal.valueOf(parte * 100.0 / total).setScale(1, java.math.RoundingMode.HALF_UP);
    }

    private static Integer promedioEntero(List<Long> valores) {
        if (valores.isEmpty()) return null;
        return (int) Math.round(valores.stream().mapToLong(Long::longValue).average().orElse(0));
    }
}
