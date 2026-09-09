package com.auroraplus.modules.salud.services;

import com.auroraplus.modules.salud.entities.CasoHistoricoImportado;
import com.auroraplus.modules.salud.entities.ConsultaMedica;
import com.auroraplus.modules.salud.repositories.CasoHistoricoImportadoRepository;
import com.auroraplus.modules.salud.repositories.ConsultaMedicaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.ToIntFunction;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Canal Endémico: la herramienta clásica de vigilancia epidemiológica (la
 * misma que usan los boletines del Ministerio de Salud para dengue, malaria,
 * etc.) construida a partir de los diagnósticos CIE-10 que los médicos ya
 * registran en cada consulta — no requiere que nadie capture nada nuevo.
 *
 * Para un médico (tenant), muestra el comportamiento de un diagnóstico en el
 * tiempo, con el "corredor" de zonas de éxito/seguridad/alerta calculado con
 * la data histórica de años anteriores — a elección de cada médico, ya sea
 * por semana o por mes (el motor de cálculo es el mismo, solo cambia la
 * unidad de agrupación). La vista ANUAL es distinta por naturaleza: un año
 * no se repite dentro de sí mismo, así que en vez de un corredor por período
 * se ofrece una banda de referencia (percentiles de los totales de años
 * anteriores) contra la que se compara el total del año consultado.
 *
 * El mismo motor, sin ningún cambio, sirve para el super-admin: bajo un
 * token de tenant normal, TenantFilterAspect mantiene el filtro de Hibernate
 * activo y todo esto queda restringido a la clínica de ese médico; bajo un
 * token SUPER_ADMIN el filtro nunca se activa (ver TenantInterceptor), así
 * que la misma consulta agrega automáticamente TODA la red de clínicas —
 * eso es lo que permite generar el reporte epidemiológico consolidado.
 */
@Service
public class CanalEndemicoService {

    @Autowired
    private ConsultaMedicaRepository consultaMedicaRepository;

    @Autowired
    private CasoHistoricoImportadoRepository casoHistoricoImportadoRepository;

    private static final WeekFields SEMANA_ISO = WeekFields.ISO;

    public record DiagnosticoFrecuente(String cie10, long totalCasos) {}

    public record PuntoAnual(int anio, long casos) {}

    public record PuntoMensual(int anio, int mes, long casos) {}

    public record PuntoSemanal(int semana, long casos) {}

    public record PuntoDelMes(int mes, long casos) {}

    /** Banda del corredor endémico para un período (semana ISO o mes calendario), calculada con los años históricos disponibles (excluye el año consultado). */
    public record BandaPeriodo(int periodo, double minimo, double percentil25, double mediana, double percentil75, double maximo) {}

    public record CasosPorTenant(Long tenantId, long totalCasos) {}

    /**
     * Banda de referencia para la vista ANUAL: a diferencia de semana/mes (que se
     * repiten cada año y sí permiten armar un corredor por período), un año no se
     * repite — no hay "años históricos de este mismo año" para comparar. En vez de
     * inventar un corredor por período, esta es la distribución (percentiles) de
     * los totales anuales de TODOS los años históricos (excluye el año consultado),
     * para dibujar una banda de referencia horizontal sobre el total del año actual.
     */
    public record ResumenAnual(double minimo, double percentil25, double mediana, double percentil75, double maximo, int aniosUsados) {}

    public static class CanalEndemico {
        public String cie10;
        public int anioConsultado;
        public int totalCasosHistorico;
        public int aniosHistoricosUsados;
        public List<PuntoAnual> porAnio;
        public List<PuntoMensual> porMes;
        public List<PuntoSemanal> semanasAnioConsultado;
        public List<BandaPeriodo> corredorHistorico; // semanal (1..53)
        public List<PuntoDelMes> mesesAnioConsultado; // 1..12, con ceros de relleno
        public List<BandaPeriodo> corredorHistoricoMensual; // mensual (1..12)
        public ResumenAnual bandaReferenciaAnual;
        /** Años históricos descartados del cálculo del corredor por ser brotes atípicos (ver depurarAniosAtipicos) — transparencia: el médico ve cuáles y por qué no cuentan como "normal". */
        public List<Integer> aniosExcluidosPorAtipicos;
    }

    /**
     * Los diagnósticos más frecuentes — para que el médico (o el super-admin) elija cuál canal ver.
     * Combina consultas reales CON el historial importado por Excel: una clínica recién creada que
     * solo cargó su historial (todavía sin ninguna consulta propia) debe poder elegir esos CIE-10
     * igual que una con historia propia — si no, el selector queda vacío y el importador de nada sirve.
     */
    public List<DiagnosticoFrecuente> diagnosticosMasFrecuentes(int limite) {
        Map<String, Long> totales = new HashMap<>();
        consultaMedicaRepository.contarPorDiagnostico(PageRequest.of(0, Integer.MAX_VALUE))
            .forEach(p -> totales.merge(p.getCie10(), p.getTotal(), Long::sum));
        casoHistoricoImportadoRepository.contarPorDiagnostico()
            .forEach(p -> totales.merge(p.getCie10(), p.getTotal(), Long::sum));

        return totales.entrySet().stream()
            .map(e -> new DiagnosticoFrecuente(e.getKey(), e.getValue()))
            .sorted(Comparator.comparingLong(DiagnosticoFrecuente::totalCasos).reversed())
            .limit(limite)
            .toList();
    }

    public CanalEndemico calcular(String cie10, int anioConsultado) {
        List<ConsultaMedica> consultas = consultaMedicaRepository.findByDiagnosticoPrincipalCIE10(cie10);
        List<CasoHistoricoImportado> importados = casoHistoricoImportadoRepository.findByDiagnosticoCie10(cie10);

        CanalEndemico resultado = new CanalEndemico();
        resultado.cie10 = cie10;
        resultado.anioConsultado = anioConsultado;
        resultado.totalCasosHistorico = consultas.size() + importados.stream().mapToInt(CasoHistoricoImportado::getCasos).sum();

        // Total por año: consultas reales + TODO lo importado (con semana, con mes, o solo anual —
        // no importa el nivel de detalle, siempre cuenta para el total del año).
        Map<Integer, Long> porAnioMap = new HashMap<>();
        consultas.forEach(c -> porAnioMap.merge(c.getFechaHora().getYear(), 1L, Long::sum));
        importados.forEach(i -> porAnioMap.merge(i.getAnio(), (long) i.getCasos(), Long::sum));
        resultado.porAnio = porAnioMap.entrySet().stream()
            .map(e -> new PuntoAnual(e.getKey(), e.getValue()))
            .sorted(Comparator.comparingInt(PuntoAnual::anio))
            .toList();

        Map<Map.Entry<Integer, Integer>, Long> porMesMap = new HashMap<>();
        consultas.forEach(c -> porMesMap.merge(Map.entry(c.getFechaHora().getYear(), c.getFechaHora().getMonthValue()), 1L, Long::sum));
        importados.stream().filter(i -> i.getMes() != null)
            .forEach(i -> porMesMap.merge(Map.entry(i.getAnio(), i.getMes()), (long) i.getCasos(), Long::sum));
        resultado.porMes = porMesMap.entrySet().stream()
            .map(e -> new PuntoMensual(e.getKey().getKey(), e.getKey().getValue(), e.getValue()))
            .sorted(Comparator.comparingInt(PuntoMensual::anio).thenComparingInt(PuntoMensual::mes))
            .toList();

        ToIntFunction<ConsultaMedica> semanaDe = c -> c.getFechaHora().get(SEMANA_ISO.weekOfWeekBasedYear());
        ToIntFunction<ConsultaMedica> mesDe = c -> c.getFechaHora().getMonthValue();

        // "Este año" combina consultas reales del año consultado con cualquier dato importado que
        // también caiga en ese mismo año (ej. un hospital nuevo importa el boletín parcial del año en curso).
        Map<Integer, Long> semanasAnioActualMap = new HashMap<>(agruparPorPeriodoEnAnio(consultas, anioConsultado, semanaDe));
        importados.stream().filter(i -> i.getAnio() == anioConsultado && i.getSemana() != null)
            .forEach(i -> semanasAnioActualMap.merge(i.getSemana(), (long) i.getCasos(), Long::sum));
        resultado.semanasAnioConsultado = IntStream.rangeClosed(1, 53)
            .mapToObj(s -> new PuntoSemanal(s, semanasAnioActualMap.getOrDefault(s, 0L)))
            .toList();

        Map<Integer, Long> mesesAnioActualMap = new HashMap<>(agruparPorPeriodoEnAnio(consultas, anioConsultado, mesDe));
        importados.stream().filter(i -> i.getAnio() == anioConsultado && i.getMes() != null)
            .forEach(i -> mesesAnioActualMap.merge(i.getMes(), (long) i.getCasos(), Long::sum));
        resultado.mesesAnioConsultado = IntStream.rangeClosed(1, 12)
            .mapToObj(m -> new PuntoDelMes(m, mesesAnioActualMap.getOrDefault(m, 0L)))
            .toList();

        Map<Integer, Map<Integer, Long>> historicoPorAnioYSemana = agruparHistoricoPorAnioYPeriodo(consultas, anioConsultado, semanaDe);
        for (CasoHistoricoImportado i : importados) {
            if (i.getSemana() != null && i.getAnio() != anioConsultado) {
                historicoPorAnioYSemana.computeIfAbsent(i.getAnio(), k -> new HashMap<>())
                    .merge(i.getSemana(), (long) i.getCasos(), Long::sum);
            }
        }
        Map<Integer, Map<Integer, Long>> historicoPorAnioYMes = agruparHistoricoPorAnioYPeriodo(consultas, anioConsultado, mesDe);
        for (CasoHistoricoImportado i : importados) {
            if (i.getMes() != null && i.getAnio() != anioConsultado) {
                historicoPorAnioYMes.computeIfAbsent(i.getAnio(), k -> new HashMap<>())
                    .merge(i.getMes(), (long) i.getCasos(), Long::sum);
            }
        }

        // Fase 1 — Depuración: un año con un brote epidémico real (cifras extraordinariamente
        // altas) NO debe contar como "normal" al construir la banda — si se mete en el promedio,
        // el umbral de alerta se infla artificialmente y la PRÓXIMA epidemia parecida pasa
        // desapercibida (se ve como "dentro de lo normal"). Se detecta con el método estándar de
        // outliers por rango intercuartílico (IQR) sobre los totales anuales históricos.
        Map<Integer, Long> totalPorAnioHistorico = resultado.porAnio.stream()
            .filter(p -> p.anio() != anioConsultado)
            .collect(Collectors.toMap(PuntoAnual::anio, PuntoAnual::casos));
        Set<Integer> aniosAtipicos = detectarAniosAtipicos(totalPorAnioHistorico);
        resultado.aniosExcluidosPorAtipicos = aniosAtipicos.stream().sorted().toList();

        Map<Integer, Map<Integer, Long>> historicoDepuradoPorSemana = excluirAnios(historicoPorAnioYSemana, aniosAtipicos);
        Map<Integer, Map<Integer, Long>> historicoDepuradoPorMes = excluirAnios(historicoPorAnioYMes, aniosAtipicos);

        // Ojo: esto NO es historicoDepuradoPorSemana.size() — un año importado solo con total
        // anual (sin desglose semanal/mensual) igual cuenta como "año de historia usado", aunque
        // no aporte nada al corredor semana a semana.
        resultado.aniosHistoricosUsados = totalPorAnioHistorico.size() - aniosAtipicos.size();
        resultado.corredorHistorico = calcularCorredorHistorico(historicoDepuradoPorSemana, 53);
        resultado.corredorHistoricoMensual = calcularCorredorHistorico(historicoDepuradoPorMes, 12);
        resultado.bandaReferenciaAnual = calcularBandaReferenciaAnual(resultado.porAnio, anioConsultado, aniosAtipicos);

        return resultado;
    }

    /**
     * Años cuyo total anual es un outlier ALTO frente a los demás años (método IQR: por encima de
     * percentil75 + 1.5×rango-intercuartílico) — típicamente un brote epidémico real, no el
     * comportamiento "normal" de la enfermedad. Solo se excluyen outliers por ARRIBA (un año con
     * pocos casos no contamina el umbral de alerta, uno con muchísimos sí). Con menos de 4 años de
     * historia no hay suficientes puntos para que un IQR sea confiable, así que no se excluye nada.
     */
    private Set<Integer> detectarAniosAtipicos(Map<Integer, Long> totalPorAnio) {
        if (totalPorAnio.size() < 4) {
            return Set.of();
        }
        double[] valores = totalPorAnio.values().stream().mapToDouble(Long::doubleValue).sorted().toArray();
        double q1 = percentil(valores, 25);
        double q3 = percentil(valores, 75);
        double iqr = q3 - q1;
        double limiteSuperior = q3 + 1.5 * iqr;

        Set<Integer> atipicos = new HashSet<>();
        for (Map.Entry<Integer, Long> e : totalPorAnio.entrySet()) {
            if (e.getValue() > limiteSuperior) {
                atipicos.add(e.getKey());
            }
        }
        return atipicos;
    }

    private Map<Integer, Map<Integer, Long>> excluirAnios(Map<Integer, Map<Integer, Long>> porAnioYPeriodo, Set<Integer> aniosAExcluir) {
        if (aniosAExcluir.isEmpty()) return porAnioYPeriodo;
        return porAnioYPeriodo.entrySet().stream()
            .filter(e -> !aniosAExcluir.contains(e.getKey()))
            .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    private ResumenAnual calcularBandaReferenciaAnual(List<PuntoAnual> porAnio, int anioExcluido, Set<Integer> aniosAtipicos) {
        double[] valores = porAnio.stream()
            .filter(p -> p.anio() != anioExcluido && !aniosAtipicos.contains(p.anio()))
            .mapToDouble(PuntoAnual::casos)
            .sorted()
            .toArray();

        if (valores.length == 0) {
            return new ResumenAnual(0, 0, 0, 0, 0, 0);
        }
        return new ResumenAnual(
            valores[0],
            percentil(valores, 25),
            percentil(valores, 50),
            percentil(valores, 75),
            valores[valores.length - 1],
            valores.length);
    }

    private Map<Integer, Long> agruparPorPeriodoEnAnio(List<ConsultaMedica> consultas, int anio, ToIntFunction<ConsultaMedica> periodoDe) {
        return consultas.stream()
            .filter(c -> c.getFechaHora().getYear() == anio)
            .collect(Collectors.groupingBy(periodoDe::applyAsInt, Collectors.counting()));
    }

    private Map<Integer, Map<Integer, Long>> agruparHistoricoPorAnioYPeriodo(List<ConsultaMedica> consultas, int anioExcluido, ToIntFunction<ConsultaMedica> periodoDe) {
        return consultas.stream()
            .filter(c -> c.getFechaHora().getYear() != anioExcluido)
            .collect(Collectors.groupingBy(
                c -> c.getFechaHora().getYear(),
                Collectors.groupingBy(periodoDe::applyAsInt, Collectors.counting())));
    }

    /** Desglose por clínica de un diagnóstico en un año — solo tiene sentido bajo un token SUPER_ADMIN (vista consolidada de toda la red). */
    public List<CasosPorTenant> desglosePorTenant(String cie10, int anio) {
        return consultaMedicaRepository.findByDiagnosticoPrincipalCIE10(cie10).stream()
            .filter(c -> c.getFechaHora().getYear() == anio)
            .collect(Collectors.groupingBy(ConsultaMedica::getTenantId, Collectors.counting()))
            .entrySet().stream()
            .map(e -> new CasosPorTenant(e.getKey(), e.getValue()))
            .sorted(Comparator.comparingLong(CasosPorTenant::totalCasos).reversed())
            .toList();
    }

    private List<BandaPeriodo> calcularCorredorHistorico(Map<Integer, Map<Integer, Long>> historicoPorAnioYPeriodo, int cantidadPeriodos) {
        List<BandaPeriodo> corredor = new ArrayList<>();
        for (int periodo = 1; periodo <= cantidadPeriodos; periodo++) {
            final int periodoActual = periodo;
            double[] valores = historicoPorAnioYPeriodo.values().stream()
                .mapToDouble(mapaPeriodos -> mapaPeriodos.getOrDefault(periodoActual, 0L).doubleValue())
                .sorted()
                .toArray();

            if (valores.length == 0) {
                corredor.add(new BandaPeriodo(periodo, 0, 0, 0, 0, 0));
            } else {
                corredor.add(new BandaPeriodo(periodo,
                    valores[0],
                    percentil(valores, 25),
                    percentil(valores, 50),
                    percentil(valores, 75),
                    valores[valores.length - 1]));
            }
        }
        return corredor;
    }

    /** Percentil por interpolación lineal (método estándar) sobre un arreglo YA ordenado ascendentemente. */
    private double percentil(double[] valoresOrdenados, double p) {
        if (valoresOrdenados.length == 1) return valoresOrdenados[0];
        double indice = (p / 100.0) * (valoresOrdenados.length - 1);
        int inferior = (int) Math.floor(indice);
        int superior = (int) Math.ceil(indice);
        if (inferior == superior) return valoresOrdenados[inferior];
        double fraccion = indice - inferior;
        return valoresOrdenados[inferior] + fraccion * (valoresOrdenados[superior] - valoresOrdenados[inferior]);
    }
}
