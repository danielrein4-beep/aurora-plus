package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.Potrero;
import com.auroraplus.modules.ganaderia.entities.SociedadCeba;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.PotreroRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaEngordeService.FilaEngorde;
import com.auroraplus.modules.ganaderia.services.GanaderiaImportacionService.PrenezActual;
import com.auroraplus.modules.ganaderia.services.GanaderiaSociedadCebaService.LineaLiquidacion;
import com.auroraplus.modules.ganaderia.services.GanaderiaSociedadCebaService.ResumenSociedad;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Reportes PDF de gestión de la finca: inventario del hato, engorde (GDP),
 * potreros y liquidación de ceba en sociedad. Mismo formato institucional que
 * los de ordeño y vacunación (ReportePdfBuilder).
 */
@Service
public class GanaderiaReportesGestionPdfService {

    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    /** Mismo umbral que la pantalla de Engorde. */
    private static final BigDecimal GDP_BAJA = new BigDecimal("0.3");

    @Autowired private AnimalRepository animalRepository;
    @Autowired private PotreroRepository potreroRepository;
    @Autowired private LicenciaTenantRepository licenciaTenantRepository;
    @Autowired private GanaderiaEngordeService engordeService;
    @Autowired private GanaderiaImportacionService importacionService;
    @Autowired private GanaderiaSociedadCebaService sociedadService;

    // ───────────────────────────── INVENTARIO DEL HATO ─────────────────────────────

    @Transactional(readOnly = true)
    public byte[] inventarioHato(Long tenantId) throws Exception {
        List<Animal> activos = animalRepository.findByTenantIdAndEstado(tenantId, "ACTIVO");
        Map<Long, PrenezActual> prenez = importacionService.prenezActual(tenantId).stream()
            .collect(Collectors.toMap(p -> p.hembraId, p -> p));

        try (ReportePdfBuilder pdf = new ReportePdfBuilder(false, licencia(tenantId), "INVENTARIO DEL HATO")) {
            pdf.subtitulo("Corte al " + LocalDate.now().format(FECHA) + " · animales activos");
            long enSociedad = activos.stream().filter(a -> a.getSociedadCebaId() != null).count();
            long machos = activos.stream().filter(a -> "MACHO".equalsIgnoreCase(a.getSexo())).count();
            BigDecimal pesoTotal = activos.stream().map(Animal::getPesoActual).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            pdf.indicadores(List.of(
                new String[]{"Total cabezas", String.valueOf(activos.size())},
                new String[]{"Propios / en sociedad", (activos.size() - enSociedad) + " / " + enSociedad},
                new String[]{"Hembras / machos", (activos.size() - machos) + " / " + machos},
                new String[]{"Preñadas", String.valueOf(prenez.size())},
                new String[]{"Peso vivo total", kg(pesoTotal, 0)}
            ));
            if (activos.isEmpty()) {
                pdf.parrafo("No hay animales activos registrados.");
                return pdf.generar();
            }

            // Por categoría: barra proporcional al total
            Map<String, List<Animal>> porCategoria = agrupar(activos, a -> texto(a.getTipoAnimal(), "Sin categoría"));
            pdf.seccion("Cabezas por categoría");
            int max = porCategoria.values().stream().mapToInt(List::size).max().orElse(1);
            List<String[]> filas = new ArrayList<>();
            List<Float> fr = new ArrayList<>();
            for (Map.Entry<String, List<Animal>> e : porCategoria.entrySet()) {
                int n = e.getValue().size();
                filas.add(new String[]{capital(e.getKey()), n + " (" + pct(n, activos.size()) + ")"});
                fr.add((float) n / max);
            }
            pdf.barras(filas, fr);

            // Categoría × raza con peso promedio y preñadas
            pdf.seccion("Detalle por categoría y raza");
            List<String[]> det = new ArrayList<>();
            for (Map.Entry<String, List<Animal>> cat : porCategoria.entrySet()) {
                for (Map.Entry<String, List<Animal>> raza : agrupar(cat.getValue(), a -> texto(a.getRaza(), "Sin raza")).entrySet()) {
                    List<Animal> g = raza.getValue();
                    long prenadas = g.stream().filter(a -> prenez.containsKey(a.getId())).count();
                    long soc = g.stream().filter(a -> a.getSociedadCebaId() != null).count();
                    det.add(new String[]{capital(cat.getKey()), raza.getKey(), String.valueOf(g.size()),
                        kg(promedio(g), 0), prenadas > 0 ? String.valueOf(prenadas) : "—", soc > 0 ? String.valueOf(soc) : "—"});
                }
            }
            pdf.tabla(new String[]{"Categoría", "Raza", "Cabezas", "Peso prom.", "Preñadas", "En sociedad"},
                new float[]{2, 2.4f, 1.2f, 1.4f, 1.2f, 1.3f}, new boolean[]{false, false, true, true, true, true}, det);

            // Preñez por padrote
            if (!prenez.isEmpty()) {
                pdf.seccion("Preñez por padrote");
                Map<String, Long> porPadrote = prenez.values().stream().collect(Collectors.groupingBy(
                    p -> p.padrote != null ? p.padrote : "Sin padrote registrado", TreeMap::new, Collectors.counting()));
                long maxP = porPadrote.values().stream().mapToLong(Long::longValue).max().orElse(1);
                List<String[]> fp = new ArrayList<>();
                List<Float> frp = new ArrayList<>();
                porPadrote.forEach((padrote, n) -> {
                    fp.add(new String[]{padrote, n + (n == 1 ? " hembra" : " hembras")});
                    frp.add((float) n / maxP);
                });
                pdf.barras(fp, frp);
            }

            // Ubicación por potrero
            pdf.seccion("Ubicación por potrero");
            Map<String, List<Animal>> porPotrero = agrupar(activos, a -> a.getPotrero() != null ? a.getPotrero().getNombre() : "Sin potrero asignado");
            int maxPot = porPotrero.values().stream().mapToInt(List::size).max().orElse(1);
            List<String[]> fpot = new ArrayList<>();
            List<Float> frpot = new ArrayList<>();
            porPotrero.forEach((pot, g) -> {
                fpot.add(new String[]{pot, g.size() + " cab."});
                frpot.add((float) g.size() / maxPot);
            });
            pdf.barras(fpot, frpot);
            pdf.nota("Categoría según el tipo registrado en la ficha de cada animal. Preñadas: hembras activas con diagnóstico de preñez vigente.");
            return pdf.generar();
        }
    }

    // ───────────────────────────── ENGORDE (GDP) ─────────────────────────────

    @Transactional(readOnly = true)
    public byte[] engorde(Long tenantId, Long potreroId, String lote) throws Exception {
        List<FilaEngorde> filas = engordeService.resumen(tenantId).stream()
            .filter(f -> potreroId == null || potreroId.equals(f.potreroId))
            .filter(f -> lote == null || lote.isBlank() || lote.equalsIgnoreCase(f.lote))
            .collect(Collectors.toList());

        try (ReportePdfBuilder pdf = new ReportePdfBuilder(true, licencia(tenantId), "REPORTE DE ENGORDE (GDP)")) {
            String alcance = "Todo el hato activo";
            if (potreroId != null) alcance = "Potrero: " + potreroRepository.findById(potreroId).filter(p -> tenantId.equals(p.getTenantId())).map(Potrero::getNombre).orElse("—");
            if (lote != null && !lote.isBlank()) alcance += " · Lote: " + lote;
            pdf.subtitulo(alcance + " · corte al " + LocalDate.now().format(FECHA));

            List<FilaEngorde> conGdp = filas.stream().filter(f -> f.gdpKgDia != null).collect(Collectors.toList());
            BigDecimal gdpProm = conGdp.isEmpty() ? null : conGdp.stream().map(f -> f.gdpKgDia).reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(conGdp.size()), 3, RoundingMode.HALF_UP);
            long estancados = filas.stream().filter(f -> f.gdpUltimoPeriodoKgDia != null && f.gdpUltimoPeriodoKgDia.compareTo(GDP_BAJA) < 0).count();
            BigDecimal ganancia = conGdp.stream().map(f -> f.gananciaTotalKg).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            pdf.indicadores(List.of(
                new String[]{"GDP promedio", gdpProm != null ? gdp(gdpProm) + " kg/día" : "—"},
                new String[]{"Animales con GDP", conGdp.size() + " de " + filas.size()},
                new String[]{"Estancados (< 0,3 kg/día)", String.valueOf(estancados)},
                new String[]{"Kilos ganados (con GDP)", kg(ganancia, 0)},
                new String[]{"Sin pesajes suficientes", String.valueOf(filas.size() - conGdp.size())}
            ));

            if (conGdp.isEmpty()) {
                pdf.parrafo("Todavía no hay animales con dos o más pesajes: registre pesajes para calcular la ganancia diaria.");
                return pdf.generar();
            }

            // Estancados primero, luego de menor a mayor GDP
            List<FilaEngorde> orden = new ArrayList<>(conGdp);
            orden.sort(Comparator.comparing((FilaEngorde f) -> f.gdpKgDia));
            if (estancados > 0) {
                pdf.seccion("Animales estancados (último tramo bajo 0,3 kg/día)");
                pdf.tabla(new String[]{"Arete", "Nombre / categoría", "Potrero", "Último peso", "GDP total", "Último tramo"},
                    new float[]{1.2f, 2.4f, 2f, 1.3f, 1.2f, 1.3f}, new boolean[]{false, false, false, true, true, true},
                    orden.stream().filter(f -> f.gdpUltimoPeriodoKgDia != null && f.gdpUltimoPeriodoKgDia.compareTo(GDP_BAJA) < 0)
                        .map(f -> new String[]{f.arete, nombreOTipo(f), texto(f.potrero, "—"), kg(f.pesoUltimo, 1),
                            gdp(f.gdpKgDia), gdp(f.gdpUltimoPeriodoKgDia)})
                        .collect(Collectors.toList()));
            }

            pdf.seccion("Detalle por animal (de menor a mayor GDP)");
            pdf.tabla(new String[]{"Arete", "Nombre / categoría", "Potrero / lote", "Peso inicial", "Último peso", "Días", "Ganancia", "GDP", "Últ. tramo", "Pesajes"},
                new float[]{1.1f, 2.1f, 2.2f, 1.5f, 1.5f, 0.8f, 1.2f, 1f, 1f, 0.9f},
                new boolean[]{false, false, false, true, true, true, true, true, true, true},
                orden.stream().map(f -> new String[]{
                    f.arete, nombreOTipo(f), potreroYLote(f.potrero, f.lote),
                    kg(f.pesoInicial, 1) + " " + fecha(f.fechaInicial), kg(f.pesoUltimo, 1) + " " + fecha(f.fechaUltimo),
                    f.dias != null ? String.valueOf(f.dias) : "—", signo(f.gananciaTotalKg) + " kg", gdp(f.gdpKgDia),
                    gdp(f.gdpUltimoPeriodoKgDia), String.valueOf(f.cantidadPesajes)
                }).collect(Collectors.toList()));
            pdf.nota("GDP = (último peso - peso inicial) ÷ días entre ambos pesajes. Último tramo: entre los dos pesajes más recientes; si cae bajo 0,3 kg/día conviene revisar alimentación, sanidad o potrero.");
            return pdf.generar();
        }
    }

    // ───────────────────────────── POTREROS ─────────────────────────────

    @Transactional(readOnly = true)
    public byte[] potreros(Long tenantId) throws Exception {
        List<Potrero> potreros = potreroRepository.findByTenantId(tenantId);
        potreros.sort(Comparator.comparing(Potrero::getNombre, Comparator.nullsLast(String::compareToIgnoreCase)));
        List<Animal> activos = animalRepository.findByTenantIdAndEstado(tenantId, "ACTIVO");
        Map<Long, Long> ocupacion = activos.stream().filter(a -> a.getPotrero() != null)
            .collect(Collectors.groupingBy(a -> a.getPotrero().getId(), Collectors.counting()));
        long sinPotrero = activos.stream().filter(a -> a.getPotrero() == null).count();
        LocalDate hoy = LocalDate.now();

        try (ReportePdfBuilder pdf = new ReportePdfBuilder(true, licencia(tenantId), "REPORTE DE POTREROS")) {
            pdf.subtitulo("Estado y ocupación al " + hoy.format(FECHA));
            BigDecimal haTotal = potreros.stream().map(Potrero::getAreaHectareas).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            long enDescanso = potreros.stream().filter(p -> "EN_DESCANSO".equals(p.getEstado())).count();
            long ubicados = activos.size() - sinPotrero;
            pdf.indicadores(List.of(
                new String[]{"Potreros", String.valueOf(potreros.size())},
                new String[]{"Área total", n(haTotal, haTotal.stripTrailingZeros().scale() > 0 ? 1 : 0) + " ha"},
                new String[]{"En uso / descanso", (potreros.size() - enDescanso) + " / " + enDescanso},
                new String[]{"Animales ubicados", ubicados + " de " + activos.size()},
                new String[]{"Carga promedio", haTotal.signum() > 0 ? n(BigDecimal.valueOf(ubicados).divide(haTotal, 2, RoundingMode.HALF_UP), 2) + " cab/ha" : "—"}
            ));
            if (potreros.isEmpty()) {
                pdf.parrafo("No hay potreros registrados.");
                return pdf.generar();
            }

            List<String[]> filas = new ArrayList<>();
            for (Potrero p : potreros) {
                boolean descanso = "EN_DESCANSO".equals(p.getEstado());
                LocalDate desde = descanso ? p.getFechaInicioDescanso() : p.getFechaInicioUso();
                Long dias = desde != null ? ChronoUnit.DAYS.between(desde, hoy) : null;
                long n = ocupacion.getOrDefault(p.getId(), 0L);
                BigDecimal area = p.getAreaHectareas();
                String estado = descanso ? "En descanso" : "EN_MANTENIMIENTO".equals(p.getEstado()) ? "Mantenimiento" : "En uso";
                if (descanso && dias != null && p.getDiasDescansoMinimo() != null && dias >= p.getDiasDescansoMinimo()) estado += " (listo)";
                filas.add(new String[]{
                    p.getNombre(), texto(p.getCodigo(), "—"), area != null ? n(area, area.stripTrailingZeros().scale() > 0 ? 1 : 0) + " ha" : "—",
                    texto(p.getTipoPasto(), "Sin definir"), estado,
                    dias != null ? dias + " d" + (descanso && p.getDiasDescansoMinimo() != null ? " / " + p.getDiasDescansoMinimo() : "") : "—",
                    String.valueOf(n), p.getCapacidadAnimales() != null ? String.valueOf(p.getCapacidadAnimales()) : "—",
                    area != null && area.signum() > 0 ? n(BigDecimal.valueOf(n).divide(area, 2, RoundingMode.HALF_UP), 2) + " cab/ha" : "—"
                });
            }
            pdf.seccion("Detalle por potrero");
            pdf.tabla(new String[]{"Potrero", "Código", "Área", "Pasto", "Estado", "Días", "Animales", "Capacidad", "Carga"},
                new float[]{2.2f, 1f, 1f, 1.8f, 1.6f, 1.1f, 1f, 1f, 1.2f},
                new boolean[]{false, false, true, false, false, true, true, true, true}, filas);

            // Ocupación respecto a la capacidad
            List<String[]> barras = new ArrayList<>();
            List<Float> fr = new ArrayList<>();
            for (Potrero p : potreros) {
                long n = ocupacion.getOrDefault(p.getId(), 0L);
                Integer cap = p.getCapacidadAnimales();
                barras.add(new String[]{p.getNombre(), cap != null && cap > 0 ? n + " / " + cap + " (" + pct(n, cap) + ")" : n + " cab."});
                fr.add(cap != null && cap > 0 ? (float) n / cap : 0f);
            }
            pdf.seccion("Ocupación respecto a la capacidad");
            pdf.barras(barras, fr);
            if (sinPotrero > 0) pdf.nota(sinPotrero + " animal(es) activos no tienen potrero asignado.");
            pdf.nota("Días: en uso, desde que entró el ganado; en descanso, desde que salió (y el mínimo de descanso configurado). \"Listo\": ya cumplió su descanso mínimo.");
            return pdf.generar();
        }
    }

    // ───────────────────────────── LIQUIDACIÓN DE SOCIEDAD ─────────────────────────────

    @Transactional(readOnly = true)
    public byte[] liquidacionSociedad(Long tenantId, Long sociedadId) throws Exception {
        ResumenSociedad r = sociedadService.detalle(tenantId, sociedadId);
        SociedadCeba s = r.sociedad;
        try (ReportePdfBuilder pdf = new ReportePdfBuilder(true, licencia(tenantId), "LIQUIDACIÓN DE CEBA EN SOCIEDAD")) {
            pdf.subtitulo("Reparto de kilos ganados · emitida el " + LocalDate.now().format(FECHA));
            List<String[]> datos = new ArrayList<>();
            datos.add(new String[]{"Socio", s.getNombreSocio()});
            datos.add(new String[]{"Documento", texto(s.getDocumentoSocio(), "—")});
            datos.add(new String[]{"Teléfono", texto(s.getTelefonoSocio(), "—")});
            datos.add(new String[]{"Inicio de la sociedad", s.getFechaInicio() != null ? s.getFechaInicio().format(FECHA) : "—"});
            datos.add(new String[]{"Reparto", "Finca " + num(s.getPorcentajeFinca()) + "% · Socio " + num(r.porcentajeSocio) + "%"});
            datos.add(new String[]{"Estado", "ACTIVA".equals(s.getEstado()) ? "Activa" : "Cerrada el " + (s.getFechaCierre() != null ? s.getFechaCierre().format(FECHA) : "—")});
            pdf.datos(datos);

            pdf.indicadores(List.of(
                new String[]{"Animales", r.animalesActivos + " activos · " + r.animalesVendidos + " vendidos"},
                new String[]{"Kilos ganados", kg(r.kilosGanadosTotal, 1)},
                new String[]{"Kilos finca", kg(r.kilosFincaTotal, 1)},
                new String[]{"Kilos socio", kg(r.kilosSocioTotal, 1)},
                new String[]{"Vendidos: finca / socio", r.animalesVendidos == 0 ? "Sin ventas" : usd(r.montoFincaVendidosUSD) + " / " + usd(r.montoSocioVendidosUSD)}
            ));

            if (r.lineas.isEmpty()) {
                pdf.parrafo("La sociedad todavía no tiene animales.");
                return pdf.generar();
            }

            float[] anchos = {1.1f, 1.6f, 1.6f, 1.2f, 1f, 1.2f, 1.1f, 1.1f, 1.3f, 1.2f, 1.2f, 1.2f};
            boolean[] der = {false, false, true, true, true, true, true, true, true, true, true, true};
            List<String[]> filas = new ArrayList<>();
            for (LineaLiquidacion l : r.lineas) {
                boolean vendido = "VENDIDO".equals(l.estado);
                filas.add(new String[]{
                    l.arete, texto(l.nombre, capital(texto(l.tipoAnimal, ""))) + (vendido ? " (vendido)" : ""),
                    kg(l.pesoEntrada, 1) + " " + fecha(l.fechaEntrada), kg(l.pesoActual, 1),
                    l.diasEnFinca != null ? String.valueOf(l.diasEnFinca) : "—", signo(l.kilosGanados) + " kg",
                    kg(l.kilosFinca, 1), kg(l.kilosSocio, 1), kg(l.kilosTotalesSocio, 1),
                    vendido ? usd(l.precioVentaUSD) : "—", vendido ? usd(l.montoFincaUSD) : "—", vendido ? usd(l.montoSocioUSD) : "—"
                });
            }
            pdf.seccion("Liquidación por animal");
            pdf.tabla(new String[]{"Arete", "Animal", "Entrada", "Actual/venta", "Días", "Ganados", "Finca", "Socio", "Total socio", "Venta", "Finca USD", "Socio USD"},
                anchos, der, filas);
            pdf.filaTotales(new String[]{"TOTAL", r.lineas.size() + (r.lineas.size() == 1 ? " animal" : " animales"), kg(r.pesoEntradaTotal, 1), kg(r.pesoActualTotal, 1), "",
                signo(r.kilosGanadosTotal) + " kg", kg(r.kilosFincaTotal, 1), kg(r.kilosSocioTotal, 1),
                kg(r.pesoEntradaTotal.add(r.kilosSocioTotal), 1), "",
                r.animalesVendidos > 0 ? usd(r.montoFincaVendidosUSD) : "—", r.animalesVendidos > 0 ? usd(r.montoSocioVendidosUSD) : "—"}, anchos, der);

            pdf.nota("Kilos ganados = peso actual (o de venta) - peso de entrada. Al socio le corresponde su peso de entrada más el "
                + num(r.porcentajeSocio) + "% de lo ganado; a la finca, el " + num(s.getPorcentajeFinca())
                + "% de lo ganado. En los animales vendidos el reparto en dólares usa el precio por kilo efectivo de esa venta.");
            if (s.getNotas() != null && !s.getNotas().isBlank()) pdf.nota("Notas del acuerdo: " + s.getNotas());
            pdf.firmas("Por la finca", "Socio: " + s.getNombreSocio());
            return pdf.generar();
        }
    }

    // ───────────────────────────── utilidades ─────────────────────────────

    private LicenciaTenant licencia(Long tenantId) {
        return licenciaTenantRepository.findByTenantId(tenantId).orElse(null);
    }

    private static <T> Map<String, List<T>> agrupar(List<T> lista, java.util.function.Function<T, String> clave) {
        Map<String, List<T>> m = new TreeMap<>();
        for (T t : lista) m.computeIfAbsent(clave.apply(t), k -> new ArrayList<>()).add(t);
        return m;
    }

    private static BigDecimal promedio(List<Animal> g) {
        List<BigDecimal> pesos = g.stream().map(Animal::getPesoActual).filter(Objects::nonNull).collect(Collectors.toList());
        if (pesos.isEmpty()) return null;
        return pesos.stream().reduce(BigDecimal.ZERO, BigDecimal::add).divide(BigDecimal.valueOf(pesos.size()), 1, RoundingMode.HALF_UP);
    }

    private static String nombreOTipo(FilaEngorde f) {
        return f.nombre != null && !f.nombre.isBlank() ? f.nombre + (f.tipoAnimal != null ? " · " + capital(f.tipoAnimal) : "") : capital(texto(f.tipoAnimal, ""));
    }

    /** Formato venezolano (como en pantalla): miles con punto, decimales con coma. */
    private static String n(BigDecimal v, int dec) {
        java.text.DecimalFormatSymbols sym = new java.text.DecimalFormatSymbols(Locale.forLanguageTag("es-VE"));
        sym.setGroupingSeparator('.');
        sym.setDecimalSeparator(',');
        java.text.DecimalFormat f = new java.text.DecimalFormat(dec == 0 ? "#,##0" : "#,##0." + "0".repeat(dec), sym);
        return f.format(v.setScale(dec, RoundingMode.HALF_UP));
    }

    private static String potreroYLote(String potrero, String lote) {
        boolean hayPotrero = potrero != null && !potrero.isBlank(), hayLote = lote != null && !lote.isBlank();
        if (hayPotrero && hayLote) return potrero + " · " + lote;
        return hayPotrero ? potrero : hayLote ? lote : "—";
    }

    private static String kg(BigDecimal v, int dec) {
        return v == null ? "—" : n(v, dec) + " kg";
    }

    private static String signo(BigDecimal v) {
        if (v == null) return "—";
        return (v.signum() > 0 ? "+" : "") + n(v, 1);
    }

    private static String gdp(BigDecimal v) {
        return v == null ? "—" : n(v, 3);
    }

    private static String usd(BigDecimal v) {
        return v == null ? "—" : "$" + n(v, 2);
    }

    private static String num(BigDecimal v) {
        return v == null ? "—" : v.stripTrailingZeros().toPlainString();
    }

    private static String pct(long n, long total) {
        return total <= 0 ? "—" : Math.round(n * 100.0 / total) + "%";
    }

    private static String fecha(LocalDate d) {
        return d == null ? "" : d.format(FECHA);
    }

    private static String texto(String s, String porDefecto) {
        return s == null || s.isBlank() ? porDefecto : s.trim();
    }

    private static String capital(String s) {
        if (s == null || s.isBlank()) return s;
        String t = s.trim().toLowerCase(Locale.ROOT).replace('_', ' ');
        return Character.toUpperCase(t.charAt(0)) + t.substring(1);
    }
}
