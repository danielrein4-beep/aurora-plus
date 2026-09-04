package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.modules.ganaderia.entities.GuiaTraslado;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

/**
 * Guía de movilización/traslado — documento legal para transportar ganado
 * fuera de la finca. Se genera en PDF listo para llevar impreso en el viaje.
 */
@Service
public class GuiaTrasladoPdfService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public byte[] generarGuiaPdf(GuiaTraslado guia) throws Exception {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            float pageHeight = page.getMediaBox().getHeight();
            float startX = 40;

            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                float y = pageHeight - 50;

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 16);
                cs.newLineAtOffset(startX, y);
                cs.showText("GUIA DE MOVILIZACION DE GANADO");
                cs.endText();
                y -= 25;

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 11);
                cs.newLineAtOffset(startX, y);
                cs.showText("No. " + guia.getNumeroGuia() + "   Fecha: " + guia.getFecha().format(FMT));
                cs.endText();
                y -= 30;

                y = escribirCampo(cs, startX, y, "Origen:", guia.getOrigen());
                y = escribirCampo(cs, startX, y, "Destino:", guia.getDestino());
                y = escribirCampo(cs, startX, y, "Motivo:", guia.getMotivo());
                y = escribirCampo(cs, startX, y, "Transportista:", guia.getTransportista() != null ? guia.getTransportista() : "-");
                y = escribirCampo(cs, startX, y, "Placa del vehiculo:", guia.getPlacaVehiculo() != null ? guia.getPlacaVehiculo() : "-");
                y = escribirCampo(cs, startX, y, "Responsable:", guia.getResponsable() != null ? guia.getResponsable() : "-");

                y -= 15;
                float[] colWidths = {70, 200, 100, 100};
                String[] headers = {"ID", "ARETE", "ESPECIE", "SEXO"};
                float rowHeight = 18f;

                cs.setNonStrokingColor(new java.awt.Color(13, 17, 23));
                cs.addRect(startX, y - rowHeight, sum(colWidths), rowHeight);
                cs.fill();
                cs.setNonStrokingColor(java.awt.Color.WHITE);
                float x = startX;
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 9);
                for (int i = 0; i < headers.length; i++) {
                    cs.beginText();
                    cs.newLineAtOffset(x + 4, y - rowHeight + 5);
                    cs.showText(headers[i]);
                    cs.endText();
                    x += colWidths[i];
                }

                y -= rowHeight;
                cs.setNonStrokingColor(java.awt.Color.BLACK);
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);

                for (var detalle : guia.getAnimales()) {
                    if (y < 100) break;
                    y -= rowHeight;
                    x = startX;
                    String[] valores = {
                        String.valueOf(detalle.getAnimal().getId()),
                        detalle.getAnimal().getArete(),
                        detalle.getAnimal().getEspecie() != null ? detalle.getAnimal().getEspecie() : "",
                        detalle.getAnimal().getSexo() != null ? detalle.getAnimal().getSexo() : ""
                    };
                    for (int i = 0; i < valores.length; i++) {
                        cs.beginText();
                        cs.newLineAtOffset(x + 4, y + 5);
                        cs.showText(valores[i]);
                        cs.endText();
                        x += colWidths[i];
                    }
                }

                y -= rowHeight + 10;
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 10);
                cs.newLineAtOffset(startX, y);
                cs.showText("Total de animales trasladados: " + guia.getAnimales().size());
                cs.endText();

                y -= 60;
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
                cs.newLineAtOffset(startX, y);
                cs.showText("Firma del responsable: _______________________________");
                cs.endText();
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
                cs.newLineAtOffset(startX + 280, y);
                cs.showText("Firma del transportista: _______________________________");
                cs.endText();
            }

            document.save(out);
            return out.toByteArray();
        }
    }

    private float escribirCampo(PDPageContentStream cs, float x, float y, String etiqueta, String valor) throws Exception {
        cs.beginText();
        cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 10);
        cs.newLineAtOffset(x, y);
        cs.showText(etiqueta);
        cs.endText();
        cs.beginText();
        cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
        cs.newLineAtOffset(x + 130, y);
        cs.showText(valor);
        cs.endText();
        return y - 16;
    }

    private float sum(float[] values) {
        float total = 0;
        for (float v : values) total += v;
        return total;
    }
}
