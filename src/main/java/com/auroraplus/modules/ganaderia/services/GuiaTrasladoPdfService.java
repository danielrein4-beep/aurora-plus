package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.DetalleGuiaTraslado;
import com.auroraplus.modules.ganaderia.entities.GuiaTraslado;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Nota de movilización de ganado: el documento de la finca que acompaña a los animales en el
 * traslado (datos del viaje, lista de animales con su peso y firmas). No sustituye la guía
 * oficial de movilización del INSAI; lleva su número cuando ya se emitió.
 */
@Service
public class GuiaTrasladoPdfService {

    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    public byte[] generarGuiaPdf(GuiaTraslado guia) throws Exception {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(guia.getTenantId()).orElse(null);
        try (ReportePdfBuilder pdf = new ReportePdfBuilder(false, licencia, "NOTA DE MOVILIZACIÓN DE GANADO")) {
            pdf.subtitulo("Nota N° " + texto(guia.getNumeroGuia(), "—") + " · fecha del traslado: "
                + (guia.getFecha() != null ? guia.getFecha().format(FECHA) : "—"));

            List<String[]> datos = new ArrayList<>();
            datos.add(new String[]{"Guía oficial INSAI", texto(guia.getNumeroGuiaOficial(), "Pendiente de emitir")});
            datos.add(new String[]{"Origen", texto(guia.getOrigen(), "—")});
            datos.add(new String[]{"Destino", texto(guia.getDestino(), "—")});
            datos.add(new String[]{"Motivo", motivo(guia.getMotivo())});
            datos.add(new String[]{"Transportista", texto(guia.getTransportista(), "—")});
            datos.add(new String[]{"Placa del vehículo", texto(guia.getPlacaVehiculo(), "—")});
            datos.add(new String[]{"Responsable en la finca", texto(guia.getResponsable(), "—")});
            pdf.datos(datos);

            List<String[]> filas = new ArrayList<>();
            BigDecimal pesoTotal = BigDecimal.ZERO;
            int conPeso = 0;
            for (DetalleGuiaTraslado d : guia.getAnimales()) {
                Animal a = d.getAnimal();
                BigDecimal peso = a.getPesoActual();
                if (peso != null && peso.signum() > 0) {
                    pesoTotal = pesoTotal.add(peso);
                    conPeso++;
                }
                filas.add(new String[]{
                    a.getArete(),
                    texto(a.getNombre(), "—"),
                    capital(a.getTipoAnimal()),
                    texto(a.getRaza(), "—"),
                    "HEMBRA".equals(a.getSexo()) ? "Hembra" : "MACHO".equals(a.getSexo()) ? "Macho" : "—",
                    peso != null && peso.signum() > 0 ? num(peso, 0) + " kg" : "—",
                });
            }
            int cabezas = filas.size();
            pdf.indicadores(List.of(
                new String[]{"Cabezas", String.valueOf(cabezas)},
                new String[]{"Peso vivo total", conPeso > 0 ? num(pesoTotal, 0) + " kg" : "—"},
                new String[]{"Peso promedio", conPeso > 0 ? num(pesoTotal.divide(BigDecimal.valueOf(conPeso), 0, RoundingMode.HALF_UP), 0) + " kg" : "—"}
            ));

            pdf.seccion("Animales movilizados");
            float[] anchos = {1.2f, 1.6f, 1.2f, 1.4f, 0.9f, 1f};
            boolean[] der = {false, false, false, false, false, true};
            pdf.tabla(new String[]{"Arete", "Nombre", "Categoría", "Raza", "Sexo", "Peso"}, anchos, der, filas);
            pdf.filaTotales(new String[]{"TOTAL", cabezas + (cabezas == 1 ? " animal" : " animales"), "", "", "",
                conPeso > 0 ? num(pesoTotal, 0) + " kg" : "—"}, anchos, der);

            pdf.nota("Documento de la finca que acompaña el traslado. No sustituye la guía oficial de movilización "
                + "emitida por el INSAI: debe viajar junto con ella. El peso es el último registrado en la finca.");
            pdf.firmas("Responsable de la finca", "Transportista", "Recibe en destino");
            return pdf.generar();
        }
    }

    private static String motivo(String m) {
        if (m == null || m.isBlank()) return "—";
        return switch (m) {
            case "VENTA" -> "Venta";
            case "FERIA" -> "Feria o subasta";
            case "MATADERO" -> "Matadero";
            case "CAMBIO_DE_FINCA" -> "Cambio de finca";
            case "TRATAMIENTO_VETERINARIO" -> "Tratamiento veterinario";
            default -> capital(m.replace('_', ' '));
        };
    }

    private static String texto(String v, String siVacio) {
        return v == null || v.isBlank() ? siVacio : v.trim();
    }

    private static String capital(String v) {
        if (v == null || v.isBlank()) return "—";
        String t = v.trim().toLowerCase();
        return Character.toUpperCase(t.charAt(0)) + t.substring(1);
    }

    private static String num(BigDecimal v, int dec) {
        DecimalFormatSymbols sym = new DecimalFormatSymbols(Locale.forLanguageTag("es-VE"));
        sym.setGroupingSeparator('.');
        sym.setDecimalSeparator(',');
        return new DecimalFormat(dec == 0 ? "#,##0" : "#,##0." + "0".repeat(dec), sym).format(v.setScale(dec, RoundingMode.HALF_UP));
    }
}
