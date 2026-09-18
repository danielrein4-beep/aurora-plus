package com.auroraplus.core.rrhh.services;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.rrhh.entities.PagoNomina;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;

/** Recibo de pago de nómina — comprobante que se le entrega al empleado. */
@Service
public class ReciboNominaPdfService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private static final java.util.Map<String, String> LABEL_TIPO_CONTROL = java.util.Map.of(
        "POR_HORA", "Pago por hora fichada",
        "SALARIO_FIJO", "Salario fijo",
        "SOLO_CONTROL", "Sin pago por horas"
    );

    public byte[] generarReciboPdf(PagoNomina pago, LicenciaTenant licencia) throws Exception {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A5);
            document.addPage(page);
            float pageHeight = page.getMediaBox().getHeight();
            float startX = 30;

            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                float y = pageHeight - 40;

                if (licencia != null && licencia.getRazonSocial() != null && !licencia.getRazonSocial().isBlank()) {
                    cs.beginText();
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 12);
                    cs.newLineAtOffset(startX, y);
                    cs.showText(licencia.getRazonSocial());
                    cs.endText();
                    y -= 14;
                    if (licencia.getRif() != null && !licencia.getRif().isBlank()) {
                        cs.beginText();
                        cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 8);
                        cs.newLineAtOffset(startX, y);
                        cs.showText("RIF: " + licencia.getRif());
                        cs.endText();
                        y -= 11;
                    }
                    if (licencia.getDomicilioFiscal() != null && !licencia.getDomicilioFiscal().isBlank()) {
                        cs.beginText();
                        cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 8);
                        cs.newLineAtOffset(startX, y);
                        cs.showText(licencia.getDomicilioFiscal());
                        cs.endText();
                        y -= 11;
                    }
                    y -= 8;
                }

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 14);
                cs.newLineAtOffset(startX, y);
                cs.showText("RECIBO DE PAGO DE NÓMINA");
                cs.endText();
                y -= 22;

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
                cs.newLineAtOffset(startX, y);
                cs.showText("Fecha de pago: " + pago.getFechaPago().toLocalDate().format(FMT));
                cs.endText();
                y -= 14;

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
                cs.newLineAtOffset(startX, y);
                cs.showText("Período liquidado: " + pago.getPeriodoDesde().format(FMT) + " - " + pago.getPeriodoHasta().format(FMT));
                cs.endText();
                y -= 20;

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 10);
                cs.newLineAtOffset(startX, y);
                cs.showText("Empleado: " + pago.getNombreEmpleado());
                cs.endText();
                y -= 13;

                if (pago.getCedulaEmpleado() != null && !pago.getCedulaEmpleado().isBlank()) {
                    cs.beginText();
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
                    cs.newLineAtOffset(startX, y);
                    cs.showText("Cédula: " + pago.getCedulaEmpleado());
                    cs.endText();
                    y -= 13;
                }
                if (pago.getCargoEmpleado() != null && !pago.getCargoEmpleado().isBlank()) {
                    cs.beginText();
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
                    cs.newLineAtOffset(startX, y);
                    cs.showText("Cargo: " + pago.getCargoEmpleado());
                    cs.endText();
                    y -= 13;
                }

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
                cs.newLineAtOffset(startX, y);
                cs.showText("Forma de pago: " + LABEL_TIPO_CONTROL.getOrDefault(pago.getTipoControl(), pago.getTipoControl()));
                cs.endText();
                y -= 13;

                if (pago.getHorasTrabajadas() != null) {
                    cs.beginText();
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
                    cs.newLineAtOffset(startX, y);
                    cs.showText("Horas fichadas en el período: " + pago.getHorasTrabajadas().setScale(2, RoundingMode.HALF_UP));
                    cs.endText();
                    y -= 13;
                }
                y -= 12;

                cs.setNonStrokingColor(new java.awt.Color(13, 17, 23));
                cs.addRect(startX, y - 20, 350, 20);
                cs.fill();
                cs.setNonStrokingColor(java.awt.Color.WHITE);
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 12);
                cs.beginText();
                cs.newLineAtOffset(startX + 8, y - 15);
                cs.showText("TOTAL PAGADO: " + pago.getMoneda() + " " + pago.getMonto().setScale(2, RoundingMode.HALF_UP));
                cs.endText();
                y -= 40;

                cs.setNonStrokingColor(java.awt.Color.BLACK);
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 7);
                cs.newLineAtOffset(startX, y);
                cs.showText("Comprobante generado por Aurora+ — recibo N.º " + pago.getId());
                cs.endText();
            }

            document.save(out);
            return out.toByteArray();
        }
    }
}
