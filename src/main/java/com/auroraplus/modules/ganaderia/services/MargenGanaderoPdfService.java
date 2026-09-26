package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.modules.ganaderia.services.MargenGanaderoService.MargenAnimal;
import com.auroraplus.modules.ganaderia.services.MargenGanaderoService.MargenLote;
import com.auroraplus.modules.ganaderia.services.MargenGanaderoService.Resultado;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Reportes PDF del margen: por lote con el detalle de sus animales, y la ficha de costo de un animal. */
@Service
public class MargenGanaderoPdfService {

    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Autowired
    private MargenGanaderoService margenService;

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    /** @param lote si viene, el detalle por animal se limita a ese lote. */
    public byte[] porLote(Long tenantId, BigDecimal precioKg, String alcance, String lote) throws Exception {
        Resultado r = margenService.calcular(tenantId, precioKg, alcance);
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId).orElse(null);
        String moneda = r.monedaBase;
        try (ReportePdfBuilder pdf = new ReportePdfBuilder(true, licencia, "MARGEN POR ANIMAL Y POR LOTE")) {
            pdf.subtitulo("Corte al " + r.fechaCorte.format(FECHA) + " · " + alcance(r.alcance)
                + (r.precioKg != null ? " · animales activos a " + dinero(r.precioKg, moneda) + "/kg" : ""));

            MargenLote t = r.totales;
            int valorados = t.animales - t.sinValorar;
            List<String[]> ind = new ArrayList<>();
            ind.add(new String[]{"Animales", String.valueOf(t.animales)});
            ind.add(new String[]{"Costo total", dinero(t.costoTotal, moneda)});
            ind.add(new String[]{"Ingreso (venta + proyectado)", dinero(t.ingreso, moneda)});
            ind.add(new String[]{"Margen neto", valorados > 0 ? dinero(t.margenNeto, moneda) : "—"});
            ind.add(new String[]{"Margen por animal", dinero(t.margenPorAnimal, moneda)});
            pdf.indicadores(ind);

            pdf.seccion("Margen por lote");
            String[] encLote = {"Lote", "Animales", "Compra", "Sanidad", "Alimentación", "Indirectos", "Costo total", "Ingreso", "Margen bruto", "Margen neto", "Por animal"};
            float[] anchoLote = {2.2f, 0.9f, 1.1f, 1f, 1.1f, 1.1f, 1.2f, 1.2f, 1.2f, 1.2f, 1.1f};
            boolean[] derLote = {false, true, true, true, true, true, true, true, true, true, true};
            List<String[]> filasLote = new ArrayList<>();
            for (MargenLote l : r.lotes) filasLote.add(filaLote(l, moneda));
            pdf.tabla(encLote, anchoLote, derLote, filasLote);
            pdf.filaTotales(filaLote(t, moneda), anchoLote, derLote);

            List<MargenAnimal> detalle = r.animales.stream()
                .filter(m -> lote == null || lote.isBlank() || lote.equalsIgnoreCase(m.lote == null ? "Sin lote" : m.lote))
                .toList();
            pdf.seccion(lote == null || lote.isBlank() ? "Detalle por animal" : "Detalle por animal · lote " + lote);
            String[] enc = {"Arete", "Animal", "Lote", "Días", "Compra", "Sanidad", "Alimentación", "Indirectos", "Costo total", "Ingreso", "Margen neto"};
            float[] anchos = {1f, 1.8f, 1.5f, 0.6f, 1f, 0.9f, 1f, 1f, 1.1f, 1.3f, 1.1f};
            boolean[] der = {false, false, false, true, true, true, true, true, true, true, true};
            List<String[]> filas = new ArrayList<>();
            for (MargenAnimal m : detalle) {
                filas.add(new String[]{
                    texto(m.arete, "—"),
                    animal(m),
                    texto(m.lote, "Sin lote"),
                    m.dias > 0 ? String.valueOf(m.dias) : "—",
                    dinero(m.adquisicion, moneda),
                    dinero(m.vacunas.add(m.medicamentos).add(m.sanidadGeneral), moneda),
                    dinero(m.alimentacion, moneda),
                    dinero(m.costoIndirecto, moneda),
                    dinero(m.costoTotal, moneda),
                    ingreso(m, moneda),
                    dinero(m.margenNeto, moneda),
                });
            }
            if (filas.isEmpty()) pdf.parrafo("No hay animales en este alcance.");
            else pdf.tabla(enc, anchos, der, filas);

            pdf.nota("Margen bruto = ingreso - costos directos (compra, vacunas, medicinas, alimento y sal mineral). "
                + "Margen neto = margen bruto - costos indirectos (nómina de obreros y gastos generales de la finca). "
                + "(P) ingreso proyectado con el peso actual; (V) venta; (B) muerte o robo, sin ingreso.");
            for (String n : r.notas) pdf.nota(n);
            return pdf.generar();
        }
    }

    public byte[] animal(Long tenantId, Long animalId, BigDecimal precioKg) throws Exception {
        Resultado r = margenService.calcular(tenantId, precioKg, "TODOS");
        MargenAnimal m = r.animales.stream().filter(a -> a.animalId.equals(animalId)).findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Animal no encontrado en esta finca"));
        String moneda = r.monedaBase;
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId).orElse(null);
        try (ReportePdfBuilder pdf = new ReportePdfBuilder(false, licencia, "COSTO Y MARGEN DEL ANIMAL")) {
            pdf.subtitulo(texto(m.arete, "—") + (m.nombre != null && !m.nombre.isBlank() ? " · " + m.nombre : "")
                + " · corte al " + r.fechaCorte.format(FECHA));

            List<String[]> datos = new ArrayList<>();
            datos.add(new String[]{"Tipo", capital(texto(m.tipoAnimal, "—"))});
            datos.add(new String[]{"Lote", texto(m.lote, "Sin lote")});
            datos.add(new String[]{"Estado", estado(m)});
            datos.add(new String[]{"Peso actual", m.pesoActual != null ? n(m.pesoActual, 1) + " kg" : "—"});
            datos.add(new String[]{"En la finca desde", m.entrada != null ? m.entrada.format(FECHA) : "Sin fecha"});
            datos.add(new String[]{"Hasta", m.salida != null && !m.salida.equals(LocalDate.now()) ? m.salida.format(FECHA) : "Hoy"});
            pdf.datos(datos);

            List<String[]> ind = new ArrayList<>();
            ind.add(new String[]{"Costo total", dinero(m.costoTotal, moneda)});
            ind.add(new String[]{"Ingreso", ingreso(m, moneda)});
            ind.add(new String[]{"Margen neto", dinero(m.margenNeto, moneda)});
            pdf.indicadores(ind);

            pdf.seccion("Desglose de costos");
            String[] enc = {"Concepto", "Tipo", "Monto"};
            float[] anchos = {3f, 1.4f, 1.2f};
            boolean[] der = {false, false, true};
            List<String[]> filas = new ArrayList<>();
            filas.add(new String[]{"Compra o valor de ingreso", "Directo", dinero(m.adquisicion, moneda)});
            filas.add(new String[]{"Vacunas aplicadas", "Directo", dinero(m.vacunas, moneda)});
            filas.add(new String[]{"Medicamentos aplicados", "Directo", dinero(m.medicamentos, moneda)});
            if (m.sanidadGeneral.signum() > 0) filas.add(new String[]{"Sanidad general de la finca (su parte)", "Directo", dinero(m.sanidadGeneral, moneda)});
            filas.add(new String[]{"Alimento, suplementos y sal mineral (su parte)", "Directo", dinero(m.alimentacion, moneda)});
            filas.add(new String[]{"Nómina de obreros (su parte)", "Indirecto", dinero(m.manoDeObra, moneda)});
            filas.add(new String[]{"Gastos generales de la finca (su parte)", "Indirecto", dinero(m.gastosGenerales, moneda)});
            pdf.tabla(enc, anchos, der, filas);
            pdf.filaTotales(new String[]{"Costo total", "", dinero(m.costoTotal, moneda)}, anchos, der);

            List<String[]> resultado = new ArrayList<>();
            resultado.add(new String[]{"Ingreso", ingreso(m, moneda)});
            resultado.add(new String[]{"Costos directos", dinero(m.costoDirecto, moneda)});
            resultado.add(new String[]{"Margen bruto", dinero(m.margenBruto, moneda)});
            resultado.add(new String[]{"Costos indirectos", dinero(m.costoIndirecto, moneda)});
            resultado.add(new String[]{"Margen neto", dinero(m.margenNeto, moneda)});
            BigDecimal porDia = m.dias > 0 ? m.costoTotal.divide(BigDecimal.valueOf(m.dias), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
            if (porDia.signum() > 0) resultado.add(new String[]{"Costo por día", dinero(porDia, moneda)});
            pdf.seccion("Resultado");
            pdf.datos(resultado);

            pdf.nota("La parte del alimento sale de lo consumido en el potrero donde estaba cada día (según las rotaciones) "
                + "y de los gastos de alimentación de su lote o del hato.");
            // Solo las notas que aplican a este animal (no las del resto del hato).
            for (String nota : r.notas) {
                if (nota.contains("sin peso o sin precio")) continue;
                if (nota.startsWith("Los animales activos se valorizan") && !"PROYECTADO".equals(m.tipoIngreso)) continue;
                pdf.nota(nota);
            }
            return pdf.generar();
        }
    }

    private static String[] filaLote(MargenLote l, String moneda) {
        boolean valorado = l.animales - l.sinValorar > 0;
        return new String[]{
            l.lote,
            String.valueOf(l.animales),
            dinero(l.adquisicion, moneda),
            dinero(l.sanidad, moneda),
            dinero(l.alimentacion, moneda),
            dinero(l.costoIndirecto, moneda),
            dinero(l.costoTotal, moneda),
            dinero(l.ingreso, moneda),
            valorado ? dinero(l.margenBruto, moneda) : "—",
            valorado ? dinero(l.margenNeto, moneda) : "—",
            dinero(l.margenPorAnimal, moneda),
        };
    }

    private static String ingreso(MargenAnimal m, String moneda) {
        return switch (m.tipoIngreso) {
            case "VENTA" -> dinero(m.ingreso, moneda) + " (V)";
            case "PROYECTADO" -> dinero(m.ingreso, moneda) + " (P)";
            case "BAJA" -> dinero(BigDecimal.ZERO, moneda) + " (B)";
            default -> "Sin valorar";
        };
    }

    private static String estado(MargenAnimal m) {
        return switch (m.tipoIngreso) {
            case "VENTA" -> "Vendido";
            case "BAJA" -> "ROBADO".equals(m.estado) ? "Robado" : "Muerto";
            default -> "Activo";
        };
    }

    private static String alcance(String a) {
        return switch (a) {
            case "ACTIVOS" -> "animales activos";
            case "VENDIDOS" -> "animales vendidos";
            default -> "activos, vendidos y bajas";
        };
    }

    private static String animal(MargenAnimal m) {
        String tipo = capital(texto(m.tipoAnimal, ""));
        return m.nombre != null && !m.nombre.isBlank() ? m.nombre + (tipo.isEmpty() ? "" : " · " + tipo) : tipo;
    }

    private static String dinero(BigDecimal v, String moneda) {
        return v == null ? "—" : MargenGanaderoService.monto(v, moneda);
    }

    /** Formato venezolano (como en pantalla): miles con punto, decimales con coma. */
    private static String n(BigDecimal v, int dec) {
        DecimalFormatSymbols sym = new DecimalFormatSymbols(Locale.forLanguageTag("es-VE"));
        sym.setGroupingSeparator('.');
        sym.setDecimalSeparator(',');
        return new DecimalFormat(dec == 0 ? "#,##0" : "#,##0." + "0".repeat(dec), sym).format(v.setScale(dec, RoundingMode.HALF_UP));
    }

    private static String texto(String v, String siVacio) {
        return v == null || v.isBlank() ? siVacio : v;
    }

    private static String capital(String s) {
        if (s == null || s.isBlank()) return "";
        String t = s.replace('_', ' ').toLowerCase();
        return Character.toUpperCase(t.charAt(0)) + t.substring(1);
    }
}
