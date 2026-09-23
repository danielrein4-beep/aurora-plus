package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.AplicacionVacuna;
import com.auroraplus.modules.ganaderia.entities.RegistroOrdeno;
import com.auroraplus.modules.ganaderia.repositories.AplicacionVacunaRepository;
import com.auroraplus.modules.ganaderia.repositories.RegistroOrdenoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Reportes imprimibles de la operación diaria de la finca:
 *  - Ordeño diario / semanal (o cualquier rango): litros por día y por vaca.
 *  - Constancia de vacunación: animales vacunados, vacuna, lote y próxima dosis.
 */
@Service
public class GanaderiaReportesPdfService {

    /** Tope de días del reporte de ordeño: más allá conviene el Excel del Centro de Reportes. */
    public static final int MAX_DIAS_ORDENO = 93;

    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DIA = DateTimeFormatter.ofPattern("EEE dd/MM", Locale.forLanguageTag("es"));

    @Autowired
    private RegistroOrdenoRepository registroOrdenoRepository;

    @Autowired
    private AplicacionVacunaRepository aplicacionVacunaRepository;

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    // ───────────────────────────── ORDEÑO ─────────────────────────────

    private static class TotalesOrdeno {
        BigDecimal manana = BigDecimal.ZERO;
        BigDecimal tarde = BigDecimal.ZERO;
        BigDecimal total = BigDecimal.ZERO;
        Set<LocalDate> dias = new HashSet<>();
        Set<Long> vacas = new HashSet<>();
        int ordenos;

        void sumar(RegistroOrdeno r) {
            BigDecimal litros = r.getCantidadLitros() != null ? r.getCantidadLitros() : BigDecimal.ZERO;
            String turno = turno(r.getTurno());
            if ("MANANA".equals(turno)) manana = manana.add(litros);
            else if ("TARDE".equals(turno)) tarde = tarde.add(litros);
            total = total.add(litros);
            dias.add(r.getFecha());
            vacas.add(r.getAnimal().getId());
            ordenos++;
        }
    }

    @Transactional(readOnly = true)
    public byte[] reporteOrdeno(Long tenantId, LocalDate desde, LocalDate hasta) throws Exception {
        if (desde == null || hasta == null) throw new IllegalArgumentException("Indique el período del reporte");
        if (hasta.isBefore(desde)) throw new IllegalArgumentException("La fecha final no puede ser anterior a la inicial");
        long dias = ChronoUnit.DAYS.between(desde, hasta) + 1;
        if (dias > MAX_DIAS_ORDENO) {
            throw new IllegalArgumentException("El reporte PDF de ordeño admite hasta " + MAX_DIAS_ORDENO + " días; para períodos más largos use el Excel");
        }

        List<RegistroOrdeno> registros = registroOrdenoRepository.findByTenantIdAndFechaBetween(tenantId, desde, hasta);
        String tipo = dias == 1 ? "DIARIO" : dias == 7 ? "SEMANAL" : "DEL PERÍODO";

        TotalesOrdeno general = new TotalesOrdeno();
        Map<LocalDate, TotalesOrdeno> porDia = new TreeMap<>();
        Map<Long, TotalesOrdeno> porVaca = new HashMap<>();
        Map<Long, Animal> vacas = new HashMap<>();
        BigDecimal ingresos = BigDecimal.ZERO;
        BigDecimal sumaGrasa = BigDecimal.ZERO;
        int conGrasa = 0;
        for (RegistroOrdeno r : registros) {
            general.sumar(r);
            porDia.computeIfAbsent(r.getFecha(), d -> new TotalesOrdeno()).sumar(r);
            porVaca.computeIfAbsent(r.getAnimal().getId(), id -> new TotalesOrdeno()).sumar(r);
            vacas.putIfAbsent(r.getAnimal().getId(), r.getAnimal());
            if (r.getMontoVenta() != null) ingresos = ingresos.add(r.getMontoVenta());
            if (r.getPorcentajeGrasa() != null) {
                sumaGrasa = sumaGrasa.add(r.getPorcentajeGrasa());
                conGrasa++;
            }
        }

        try (ReportePdfBuilder pdf = new ReportePdfBuilder(false, licencia(tenantId), "REPORTE DE ORDEÑO " + tipo)) {
            pdf.subtitulo(dias == 1
                ? "Fecha: " + desde.format(FECHA)
                : "Período: " + desde.format(FECHA) + " al " + hasta.format(FECHA) + " (" + dias + " días)");

            if (registros.isEmpty()) {
                pdf.parrafo("No hay ordeños registrados en este período.");
                return pdf.generar();
            }

            // Promedio por vaca y día: litros / (vacas-día efectivamente ordeñadas)
            int vacasDia = porDia.values().stream().mapToInt(t -> t.vacas.size()).sum();
            List<String[]> kpis = new ArrayList<>();
            kpis.add(new String[]{"Total litros", litros(general.total) + " L"});
            kpis.add(new String[]{"Vacas ordeñadas", String.valueOf(general.vacas.size())});
            kpis.add(new String[]{"Promedio vaca/día", litros(dividir(general.total, vacasDia)) + " L"});
            if (dias > 1) kpis.add(new String[]{"Promedio diario", litros(dividir(general.total, general.dias.size())) + " L"});
            if (ingresos.signum() > 0) kpis.add(new String[]{"Ingreso estimado", "USD " + ingresos.setScale(2, RoundingMode.HALF_UP)});
            if (conGrasa > 0) kpis.add(new String[]{"Grasa promedio", dividir(sumaGrasa, conGrasa).setScale(2, RoundingMode.HALF_UP) + " %"});
            pdf.indicadores(kpis);

            if (dias > 1) {
                pdf.seccion("Producción por día");
                float[] anchosDia = {3, 2, 2, 2, 2};
                boolean[] derDia = {false, true, true, true, true};
                List<String[]> filasDia = new ArrayList<>();
                for (Map.Entry<LocalDate, TotalesOrdeno> e : porDia.entrySet()) {
                    TotalesOrdeno t = e.getValue();
                    filasDia.add(new String[]{e.getKey().format(DIA), litros(t.manana), litros(t.tarde), litros(t.total), String.valueOf(t.vacas.size())});
                }
                pdf.tabla(new String[]{"Día", "Mañana (L)", "Tarde (L)", "Total (L)", "Vacas"}, anchosDia, derDia, filasDia);
                pdf.filaTotales(new String[]{"TOTAL", litros(general.manana), litros(general.tarde), litros(general.total), String.valueOf(general.vacas.size())},
                    anchosDia, derDia);
            }

            pdf.seccion("Producción por vaca");
            float[] anchos = {2, 3.2f, 1.4f, 1.8f, 1.8f, 1.8f, 1.8f};
            boolean[] der = {false, false, true, true, true, true, true};
            List<String[]> filas = porVaca.entrySet().stream()
                .sorted((a, b) -> b.getValue().total.compareTo(a.getValue().total))
                .map(e -> {
                    Animal a = vacas.get(e.getKey());
                    TotalesOrdeno t = e.getValue();
                    return new String[]{a.getArete(), a.getNombre() != null ? a.getNombre() : "", String.valueOf(t.ordenos),
                        litros(t.manana), litros(t.tarde), litros(t.total), litros(dividir(t.total, t.dias.size()))};
                })
                .collect(Collectors.toList());
            pdf.tabla(new String[]{"Arete", "Nombre", "Ordeños", "Mañana (L)", "Tarde (L)", "Total (L)", "Prom./día"}, anchos, der, filas);
            pdf.filaTotales(new String[]{"TOTAL", general.vacas.size() + " vacas", String.valueOf(general.ordenos),
                litros(general.manana), litros(general.tarde), litros(general.total), ""}, anchos, der);

            return pdf.generar();
        }
    }

    // ─────────────────────────── VACUNACIÓN ───────────────────────────

    @Transactional(readOnly = true)
    public byte[] constanciaVacunacion(Long tenantId, LocalDate desde, LocalDate hasta, Long vacunaId) throws Exception {
        if (desde == null || hasta == null) throw new IllegalArgumentException("Indique la fecha de la vacunación");
        if (hasta.isBefore(desde)) throw new IllegalArgumentException("La fecha final no puede ser anterior a la inicial");

        List<AplicacionVacuna> aplicaciones = aplicacionVacunaRepository.findAplicadasEntre(tenantId, desde, hasta).stream()
            .filter(a -> vacunaId == null || vacunaId.equals(a.getVacuna().getId()))
            .sorted(Comparator.comparing(AplicacionVacuna::getFechaAplicacion)
                .thenComparing(a -> a.getVacuna().getNombre(), Comparator.nullsLast(String::compareTo))
                .thenComparing(a -> a.getAnimal().getArete()))
            .collect(Collectors.toList());

        try (ReportePdfBuilder pdf = new ReportePdfBuilder(true, licencia(tenantId), "CONSTANCIA DE VACUNACIÓN")) {
            pdf.subtitulo(desde.equals(hasta)
                ? "Fecha de aplicación: " + desde.format(FECHA)
                : "Aplicaciones del " + desde.format(FECHA) + " al " + hasta.format(FECHA));

            if (aplicaciones.isEmpty()) {
                pdf.parrafo("No hay vacunas aplicadas en este período" + (vacunaId != null ? " para la vacuna seleccionada." : "."));
                return pdf.generar();
            }

            Set<String> vacunas = new LinkedHashSet<>();
            Set<String> veterinarios = new LinkedHashSet<>();
            LocalDate proxima = null;
            for (AplicacionVacuna a : aplicaciones) {
                vacunas.add(nombreVacuna(a));
                if (a.getVeterinarioResponsable() != null && !a.getVeterinarioResponsable().isBlank()) {
                    veterinarios.add(a.getVeterinarioResponsable().trim());
                }
                if (a.getFechaProximaDosis() != null && (proxima == null || a.getFechaProximaDosis().isBefore(proxima))) {
                    proxima = a.getFechaProximaDosis();
                }
            }
            long animales = aplicaciones.stream().map(a -> a.getAnimal().getId()).distinct().count();
            pdf.indicadores(List.of(
                new String[]{"Animales vacunados", String.valueOf(animales)},
                new String[]{vacunas.size() == 1 ? "Vacuna" : "Vacunas", String.join(", ", vacunas)},
                new String[]{"Veterinario responsable", veterinarios.isEmpty() ? "No indicado" : String.join(", ", veterinarios)},
                new String[]{"Próxima dosis", proxima != null ? proxima.format(FECHA) : "Sin refuerzo"}
            ));

            // Resumen por vacuna: útil cuando en la jornada se aplicó más de una.
            if (vacunas.size() > 1) {
                pdf.seccion("Resumen por vacuna");
                Map<String, List<AplicacionVacuna>> porVacuna = aplicaciones.stream()
                    .collect(Collectors.groupingBy(this::nombreVacuna, LinkedHashMap::new, Collectors.toList()));
                List<String[]> filas = new ArrayList<>();
                for (Map.Entry<String, List<AplicacionVacuna>> e : porVacuna.entrySet()) {
                    AplicacionVacuna muestra = e.getValue().get(0);
                    LocalDate prox = e.getValue().stream().map(AplicacionVacuna::getFechaProximaDosis)
                        .filter(Objects::nonNull).min(LocalDate::compareTo).orElse(null);
                    filas.add(new String[]{e.getKey(), texto(muestra.getVacuna().getEnfermedadPrevenida()),
                        String.valueOf(e.getValue().size()), prox != null ? prox.format(FECHA) : "Sin refuerzo"});
                }
                pdf.tabla(new String[]{"Vacuna", "Previene", "Animales", "Próxima dosis"}, new float[]{3, 3, 1.2f, 1.6f},
                    new boolean[]{false, false, true, false}, filas);
            }

            pdf.seccion("Animales vacunados");
            boolean variasFechas = !desde.equals(hasta);
            List<String> encabezados = new ArrayList<>(List.of("#", "Arete", "Nombre", "Categoría", "Potrero", "Vacuna", "Lote vacuna"));
            List<Float> anchos = new ArrayList<>(List.of(0.6f, 1.5f, 2f, 1.4f, 1.8f, 2.4f, 1.5f));
            if (variasFechas) {
                encabezados.add(1, "Fecha");
                anchos.add(1, 1.4f);
            }
            encabezados.addAll(List.of("Próxima dosis", "Retiro leche", "Retiro carne"));
            anchos.addAll(List.of(1.5f, 1.4f, 1.4f));

            List<String[]> filas = new ArrayList<>();
            int n = 1;
            for (AplicacionVacuna a : aplicaciones) {
                Animal an = a.getAnimal();
                List<String> fila = new ArrayList<>(List.of(String.valueOf(n++), an.getArete(), texto(an.getNombre()),
                    texto(an.getTipoAnimal()), an.getPotrero() != null ? texto(an.getPotrero().getNombre()) : "",
                    nombreVacuna(a), texto(a.getLote())));
                if (variasFechas) fila.add(1, a.getFechaAplicacion().format(FECHA));
                fila.addAll(List.of(fecha(a.getFechaProximaDosis()), retiro(a.getFechaFinRetiroLeche(), a), retiro(a.getFechaFinRetiroCarne(), a)));
                filas.add(fila.toArray(new String[0]));
            }
            float[] w = new float[anchos.size()];
            boolean[] der = new boolean[anchos.size()];
            for (int i = 0; i < w.length; i++) w[i] = anchos.get(i);
            der[0] = true;
            pdf.tabla(encabezados.toArray(new String[0]), w, der, filas);

            boolean hayRetiro = aplicaciones.stream().anyMatch(x -> !"Sin retiro".equals(retiro(x.getFechaFinRetiroLeche(), x))
                || !"Sin retiro".equals(retiro(x.getFechaFinRetiroCarne(), x)));
            if (hayRetiro) {
                pdf.parrafo("Retiro: hasta esa fecha inclusive la leche y la carne del animal no deben destinarse al consumo.");
            }
            pdf.firmas("Veterinario responsable", "Encargado de finca");
            return pdf.generar();
        }
    }

    // ───────────────────────────── utilidades ─────────────────────────────

    private LicenciaTenant licencia(Long tenantId) {
        return licenciaTenantRepository.findByTenantId(tenantId).orElse(null);
    }

    private String nombreVacuna(AplicacionVacuna a) {
        String nombre = a.getVacuna() != null ? a.getVacuna().getNombre() : null;
        return nombre != null && !nombre.isBlank() ? nombre.trim() : "Vacuna sin nombre";
    }

    /** MAÑANA / MANANA / Mañana → MANANA; TARDE → TARDE. */
    static String turno(String t) {
        if (t == null) return "";
        String s = Normalizer.normalize(t, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toUpperCase(Locale.ROOT).trim();
        if (s.startsWith("MAN") || s.equals("AM")) return "MANANA";
        if (s.startsWith("TAR") || s.equals("PM")) return "TARDE";
        return s;
    }

    private static BigDecimal dividir(BigDecimal a, int b) {
        return b == 0 ? BigDecimal.ZERO : a.divide(BigDecimal.valueOf(b), 4, RoundingMode.HALF_UP);
    }

    private static String litros(BigDecimal v) {
        return v.setScale(1, RoundingMode.HALF_UP).toPlainString();
    }

    private static String fecha(LocalDate d) {
        return d != null ? d.format(FECHA) : "-";
    }

    /** Un fin de retiro igual o anterior a la aplicación significa que la vacuna no tiene retiro. */
    private static String retiro(LocalDate fin, AplicacionVacuna a) {
        return fin != null && fin.isAfter(a.getFechaAplicacion()) ? fin.format(FECHA) : "Sin retiro";
    }

    private static String texto(String s) {
        return s != null ? s.trim() : "";
    }
}
