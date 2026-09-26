package com.auroraplus.modules.pacientesapp.services;

/** Cédulas venezolanas: "V-24.815.678", "v24815678" y "24815678" son la misma. */
public final class Cedula {

    private Cedula() {}

    /** Devuelve letra + dígitos (V24815678) o lanza un error claro si no parece una cédula. */
    public static String normalizar(String texto) {
        if (texto == null) throw new RuntimeException("Escribe tu cédula");
        String limpio = texto.toUpperCase().replaceAll("[^VEJPG0-9]", "");
        String letra = "V";
        if (!limpio.isEmpty() && Character.isLetter(limpio.charAt(0))) {
            letra = limpio.substring(0, 1);
            limpio = limpio.substring(1);
        }
        limpio = limpio.replaceAll("\\D", "");
        if (limpio.length() < 6 || limpio.length() > 10) throw new RuntimeException("La cédula no parece válida");
        return letra + limpio;
    }

    /** Formato con guion, como se guarda en la ficha del consultorio: V-24815678. */
    public static String conGuion(String normalizada) {
        return normalizada.charAt(0) + "-" + normalizada.substring(1);
    }

    /** Solo los dígitos, para comparar con fichas escritas de cualquier forma. */
    public static String digitos(String texto) {
        return texto == null ? "" : texto.replaceAll("\\D", "");
    }
}
