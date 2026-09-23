package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.core.config.entities.LicenciaTenant;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Reporte PDF tabular de varias páginas para Ganadería: encabezado de la finca,
 * título, bloque de indicadores y tablas que continúan en páginas nuevas
 * repitiendo su encabezado. Pie con "Página X de Y". A diferencia de las notas
 * de entrega (una sola página), aquí la cantidad de animales no tiene tope.
 */
class ReportePdfBuilder implements AutoCloseable {

    private static final float MARGEN = 30;
    private static final float ALTO_FILA = 15;
    private static final float ALTO_PIE = 30;
    private static final Color VERDE_ABISAL = new Color(13, 59, 61);
    private static final Color GRIS_FILA = new Color(243, 246, 246);
    private static final Color GRIS_TEXTO = new Color(90, 100, 105);

    private final PDType1Font normal = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
    private final PDType1Font negrita = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
    private final PDDocument documento = new PDDocument();
    private final PDRectangle formato;
    private final String nombreFinca;
    private final String rif;
    private final String titulo;
    private PDPageContentStream cs;
    private float y;

    ReportePdfBuilder(boolean horizontal, LicenciaTenant licencia, String titulo) throws IOException {
        this.formato = horizontal ? new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth()) : PDRectangle.A4;
        String razon = licencia != null ? primeroNoVacio(licencia.getRazonSocial(), licencia.getNombreEmpresa()) : null;
        this.nombreFinca = razon != null ? razon : "Aurora Ganadería";
        this.rif = licencia != null ? primeroNoVacio(licencia.getRif()) : null;
        this.titulo = titulo;
        nuevaPagina();
    }

    float anchoUtil() {
        return formato.getWidth() - 2 * MARGEN;
    }

    void subtitulo(String texto) throws IOException {
        asegurarEspacio(14);
        texto(normal, 9, GRIS_TEXTO, MARGEN, y, texto);
        y -= 14;
    }

    /** Fila de indicadores: pares etiqueta/valor en cajas del mismo ancho. */
    void indicadores(List<String[]> pares) throws IOException {
        if (pares.isEmpty()) return;
        float alto = 38;
        asegurarEspacio(alto + 10);
        float gap = 8;
        float ancho = (anchoUtil() - gap * (pares.size() - 1)) / pares.size();
        float x = MARGEN;
        for (String[] par : pares) {
            cs.setNonStrokingColor(GRIS_FILA);
            cs.addRect(x, y - alto, ancho, alto);
            cs.fill();
            texto(normal, 7, GRIS_TEXTO, x + 6, y - 12, recortar(par[0].toUpperCase(), normal, 7, ancho - 12));
            texto(negrita, 12, VERDE_ABISAL, x + 6, y - 29, recortar(par[1], negrita, 12, ancho - 12));
            x += ancho + gap;
        }
        y -= alto + 14;
    }

    void seccion(String texto) throws IOException {
        asegurarEspacio(ALTO_FILA * 3 + 18);
        y -= 4;
        texto(negrita, 11, VERDE_ABISAL, MARGEN, y, texto);
        y -= 14;
    }

    void parrafo(String texto) throws IOException {
        asegurarEspacio(14);
        texto(normal, 9, Color.BLACK, MARGEN, y, texto);
        y -= 14;
    }

    /**
     * @param anchos proporciones relativas de cada columna.
     * @param derecha true en las columnas numéricas (alineadas a la derecha).
     */
    void tabla(String[] encabezados, float[] anchos, boolean[] derecha, List<String[]> filas) throws IOException {
        float total = 0;
        for (float a : anchos) total += a;
        float[] w = new float[anchos.length];
        for (int i = 0; i < anchos.length; i++) w[i] = anchos[i] / total * anchoUtil();

        asegurarEspacio(ALTO_FILA * 2);
        encabezadoTabla(encabezados, w, derecha);
        boolean alterna = false;
        for (String[] fila : filas) {
            if (y - ALTO_FILA < MARGEN + ALTO_PIE) {
                nuevaPagina();
                encabezadoTabla(encabezados, w, derecha);
                alterna = false;
            }
            if (alterna) {
                cs.setNonStrokingColor(GRIS_FILA);
                cs.addRect(MARGEN, y - ALTO_FILA, anchoUtil(), ALTO_FILA);
                cs.fill();
            }
            celdas(fila, w, derecha, normal, Color.BLACK);
            alterna = !alterna;
        }
        y -= 10;
    }

    /** Fila de totales en negrita con línea superior, pegada a la tabla anterior. */
    void filaTotales(String[] valores, float[] anchos, boolean[] derecha) throws IOException {
        float total = 0;
        for (float a : anchos) total += a;
        float[] w = new float[anchos.length];
        for (int i = 0; i < anchos.length; i++) w[i] = anchos[i] / total * anchoUtil();
        y += 10;
        asegurarEspacio(ALTO_FILA);
        cs.setStrokingColor(VERDE_ABISAL);
        cs.setLineWidth(0.8f);
        cs.moveTo(MARGEN, y);
        cs.lineTo(MARGEN + anchoUtil(), y);
        cs.stroke();
        celdas(valores, w, derecha, negrita, VERDE_ABISAL);
        y -= 10;
    }

    /** Líneas de firma al pie del contenido (p. ej. veterinario responsable). */
    void firmas(String... etiquetas) throws IOException {
        asegurarEspacio(60);
        y -= 36;
        float ancho = Math.min(220, (anchoUtil() - 30 * (etiquetas.length - 1)) / etiquetas.length);
        float x = MARGEN;
        cs.setStrokingColor(Color.BLACK);
        cs.setLineWidth(0.6f);
        for (String etiqueta : etiquetas) {
            cs.moveTo(x, y);
            cs.lineTo(x + ancho, y);
            cs.stroke();
            texto(normal, 8, GRIS_TEXTO, x, y - 11, etiqueta);
            x += ancho + 30;
        }
        y -= 20;
    }

    byte[] generar() throws IOException {
        cs.close();
        cs = null;
        int totalPaginas = documento.getNumberOfPages();
        String generado = "Generado por Aurora el " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        for (int i = 0; i < totalPaginas; i++) {
            try (PDPageContentStream pie = new PDPageContentStream(documento, documento.getPage(i), PDPageContentStream.AppendMode.APPEND, true)) {
                pie.setNonStrokingColor(GRIS_TEXTO);
                escribir(pie, normal, 7, MARGEN, MARGEN - 10, generado);
                String pagina = "Página " + (i + 1) + " de " + totalPaginas;
                escribir(pie, normal, 7, formato.getWidth() - MARGEN - normal.getStringWidth(limpiar(pagina, normal)) / 1000 * 7, MARGEN - 10, pagina);
            }
        }
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            documento.save(out);
            return out.toByteArray();
        }
    }

    @Override
    public void close() throws IOException {
        if (cs != null) cs.close();
        documento.close();
    }

    // ── internos ──

    private void nuevaPagina() throws IOException {
        if (cs != null) cs.close();
        PDPage pagina = new PDPage(formato);
        documento.addPage(pagina);
        cs = new PDPageContentStream(documento, pagina);
        y = formato.getHeight() - MARGEN;

        texto(negrita, 12, Color.BLACK, MARGEN, y - 4, nombreFinca);
        if (rif != null) {
            texto(normal, 8, GRIS_TEXTO, MARGEN, y - 16, "RIF: " + rif);
        }
        float anchoTitulo = negrita.getStringWidth(limpiar(titulo, negrita)) / 1000 * 11;
        texto(negrita, 11, VERDE_ABISAL, formato.getWidth() - MARGEN - anchoTitulo, y - 4, titulo);
        y -= 24;
        cs.setStrokingColor(VERDE_ABISAL);
        cs.setLineWidth(1.2f);
        cs.moveTo(MARGEN, y);
        cs.lineTo(formato.getWidth() - MARGEN, y);
        cs.stroke();
        y -= 16;
    }

    private void asegurarEspacio(float alto) throws IOException {
        if (y - alto < MARGEN + ALTO_PIE) nuevaPagina();
    }

    private void encabezadoTabla(String[] encabezados, float[] w, boolean[] derecha) throws IOException {
        cs.setNonStrokingColor(VERDE_ABISAL);
        cs.addRect(MARGEN, y - ALTO_FILA - 2, anchoUtil(), ALTO_FILA + 2);
        cs.fill();
        y -= 2;
        celdas(encabezados, w, derecha, negrita, Color.WHITE);
    }

    private void celdas(String[] valores, float[] w, boolean[] derecha, PDType1Font fuente, Color color) throws IOException {
        float x = MARGEN;
        float tam = 8;
        for (int i = 0; i < w.length; i++) {
            String v = i < valores.length && valores[i] != null ? valores[i] : "";
            String t = recortar(v, fuente, tam, w[i] - 8);
            float tx = derecha[i] ? x + w[i] - 4 - fuente.getStringWidth(t) / 1000 * tam : x + 4;
            texto(fuente, tam, color, tx, y - ALTO_FILA + 4.5f, t);
            x += w[i];
        }
        y -= ALTO_FILA;
    }

    private void texto(PDType1Font fuente, float tam, Color color, float x, float yy, String t) throws IOException {
        cs.setNonStrokingColor(color);
        escribir(cs, fuente, tam, x, yy, t);
    }

    private static void escribir(PDPageContentStream s, PDType1Font fuente, float tam, float x, float yy, String t) throws IOException {
        s.beginText();
        s.setFont(fuente, tam);
        s.newLineAtOffset(x, yy);
        s.showText(limpiar(t, fuente));
        s.endText();
    }

    /** Recorta con "..." para que el texto no invada la columna vecina. */
    private static String recortar(String t, PDType1Font fuente, float tam, float ancho) throws IOException {
        String limpio = limpiar(t, fuente);
        if (fuente.getStringWidth(limpio) / 1000 * tam <= ancho) return limpio;
        String s = limpio;
        while (s.length() > 1 && fuente.getStringWidth(s + "...") / 1000 * tam > ancho) {
            s = s.substring(0, s.length() - 1);
        }
        return s + "...";
    }

    /** Las fuentes estándar (WinAnsi) no tienen todos los caracteres: se sustituyen para no reventar el PDF. */
    private static String limpiar(String t, PDType1Font fuente) {
        if (t == null) return "";
        StringBuilder sb = new StringBuilder(t.length());
        for (int i = 0; i < t.length(); ) {
            int cp = t.codePointAt(i);
            String c = new String(Character.toChars(cp));
            try {
                fuente.encode(c);
                sb.append(c);
            } catch (IllegalArgumentException | IOException e) {
                sb.append(Character.isWhitespace(cp) ? " " : "?");
            }
            i += Character.charCount(cp);
        }
        return sb.toString();
    }

    private static String primeroNoVacio(String... valores) {
        for (String v : valores) {
            if (v != null && !v.isBlank()) return v.trim();
        }
        return null;
    }
}
