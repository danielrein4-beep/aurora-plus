package com.auroraplus.modules.horeca.services;

import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.entities.ItemComanda;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.RoundingMode;
import java.nio.charset.Charset;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Genera el ticket como comandos ESC/POS crudos (no PDF) para enviarlos
 * directamente a una impresora térmica — el frontend los escribe por Web
 * Serial/WebUSB al dispositivo, sin pasar por el diálogo de impresión del
 * navegador. La codificación de texto es CP437 (la que trae por defecto la
 * inmensa mayoría de impresoras térmicas de 58/80mm) — si la impresora está
 * configurada en otra página de códigos, ajustar CHARSET acá.
 */
@Service
public class ComandaEscPosService {

    private static final Charset CHARSET = Charset.forName("Cp437");
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final int ANCHO_COLUMNAS = 32; // 80mm con fuente estándar ≈ 32 columnas

    private static final byte[] INIT = { 0x1B, 0x40 };
    private static final byte[] NEGRITA_ON = { 0x1B, 0x45, 0x01 };
    private static final byte[] NEGRITA_OFF = { 0x1B, 0x45, 0x00 };
    private static final byte[] CENTRAR = { 0x1B, 0x61, 0x01 };
    private static final byte[] IZQUIERDA = { 0x1B, 0x61, 0x00 };
    private static final byte[] DOBLE_ALTO_ON = { 0x1D, 0x21, 0x11 };
    private static final byte[] DOBLE_ALTO_OFF = { 0x1D, 0x21, 0x00 };
    private static final byte[] CORTE = { 0x1D, 0x56, 0x01 };

    public byte[] generarTicket(Comanda comanda, List<ItemComanda> items) throws IOException {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            out.write(INIT);

            out.write(CENTRAR);
            out.write(NEGRITA_ON);
            escribirLinea(out, comanda.getNumeroMesa() != null ? "MESA " + comanda.getNumeroMesa() : comanda.getCanal());
            out.write(NEGRITA_OFF);
            out.write(IZQUIERDA);

            escribirLinea(out, "Mesero: " + comanda.getMesero());
            escribirLinea(out, comanda.getFechaCierre() != null ? comanda.getFechaCierre().format(FMT) : "");
            escribirSeparador(out);

            for (ItemComanda item : items) {
                String cantidadTexto = item.getCantidad().stripTrailingZeros().toPlainString();
                String subtotal = "$" + item.getPrecioUnitario().multiply(item.getCantidad()).setScale(2, RoundingMode.HALF_UP);
                String izquierda = cantidadTexto + "x " + item.getNombrePlato();
                escribirLinea(out, alinearDosColumnas(izquierda, subtotal));
            }

            escribirSeparador(out);

            out.write(NEGRITA_ON);
            out.write(DOBLE_ALTO_ON);
            escribirLinea(out, "TOTAL: $" + comanda.getTotalConsumo().setScale(2, RoundingMode.HALF_UP));
            out.write(DOBLE_ALTO_OFF);
            out.write(NEGRITA_OFF);

            escribirLinea(out, "Pago: " + (comanda.getMetodoPago() != null ? comanda.getMetodoPago() : "-"));

            out.write('\n');
            out.write('\n');
            out.write('\n');
            out.write(CORTE);

            return out.toByteArray();
        }
    }

    private void escribirLinea(ByteArrayOutputStream out, String texto) throws IOException {
        out.write((texto != null ? texto : "").getBytes(CHARSET));
        out.write('\n');
    }

    private void escribirSeparador(ByteArrayOutputStream out) throws IOException {
        escribirLinea(out, "-".repeat(ANCHO_COLUMNAS));
    }

    /** Alinea dos textos en una línea de ANCHO_COLUMNAS: izquierda pegada al margen, derecha pegada al borde. */
    private String alinearDosColumnas(String izquierda, String derecha) {
        int espacio = ANCHO_COLUMNAS - izquierda.length() - derecha.length();
        if (espacio < 1) {
            int maxIzquierda = ANCHO_COLUMNAS - derecha.length() - 1;
            izquierda = maxIzquierda > 0 ? izquierda.substring(0, Math.min(izquierda.length(), maxIzquierda)) : "";
            espacio = ANCHO_COLUMNAS - izquierda.length() - derecha.length();
        }
        return izquierda + " ".repeat(Math.max(1, espacio)) + derecha;
    }
}
