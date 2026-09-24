package com.auroraplus.modules.ganaderia.services;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Tapa los datos de contacto que las fincas intentan pasarse en el mercado
 * ganadero antes de cerrar el trato (y así saltarse la comisión).
 *
 * La gente disfraza el teléfono de mil formas: "0414 123 4567", "o414.l23",
 * "cero cuatro catorce...", con emojis de teclas (4️⃣1️⃣4️⃣), dígitos en
 * círculo, de ancho completo, o nombrando la red ("wp", "ig", "búscame en
 * la página verde"). Por eso se busca sobre una versión normalizada del texto
 * (minúsculas, sin tildes, emojis y dígitos raros convertidos a dígitos) y se
 * tapan los tramos equivalentes del texto original.
 */
public final class FiltroContactoMercado {

    public static final String OCULTO = "[dato oculto]";

    public record Resultado(String texto, boolean huboContacto) {}

    private FiltroContactoMercado() {}

    private static final String NUMERO_EN_LETRAS =
        "cero|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|"
            + "dieciseis|diecisiete|dieciocho|diecinueve|veinte|veinti[a-z]+|treinta|cuarenta|cincuenta|sesenta|"
            + "setenta|ochenta|noventa|cien|ciento";

    /** Cuatro o más números seguidos, en letras o mezclados con dígitos: "cero cuatro catorce uno dos". */
    private static final Pattern NUMEROS_EN_LETRAS = Pattern.compile(
        "\\b(?:(?:" + NUMERO_EN_LETRAS + "|\\d+)[\\s,.\\-/]+(?:y\\s+)?){3,}(?:" + NUMERO_EN_LETRAS + "|\\d+)\\b");

    /**
     * Bloques con al menos un dígito separados por espacios, puntos o guiones. Dentro de un bloque
     * "o" y "l" cuentan como 0 y 1 ("o414"), pero una "o" suelta es la conjunción ("1200 o 1100").
     */
    private static final Pattern TELEFONO = Pattern.compile(
        "(?:\\+\\s*)?[0-9ol]*\\d[0-9ol]*(?:[\\s.\\-_/()*|]+[0-9ol]*\\d[0-9ol]*)*");

    /** Un monto con separadores de miles ("1.100.000", "12,500.50") no es un teléfono. */
    private static final Pattern MONTO = Pattern.compile("\\d{1,3}(?:[.,]\\d{3})+(?:[.,]\\d{1,2})?");

    /** Un número pegado a una moneda o unidad es un precio o un peso, no un teléfono. */
    private static final Pattern MONEDA_ANTES = Pattern.compile("(?:\\$|\\bbs\\.?|\\busd|\\bref\\.?)\\s*$");
    private static final Pattern MONEDA_DESPUES = Pattern.compile(
        "^\\s*(?:\\$|bs\\b|bs\\.|bolivares|bolivar|usd|dolares|dolar|mil\\b|millones|kg|kilos)");

    private static final Pattern CORREO = Pattern.compile(
        "[a-z0-9._%+\\-]+\\s*(?:@|\\(at\\)|\\[at\\]|\\barroba\\b)\\s*[a-z0-9\\-]+(?:\\s*(?:\\.|\\bpunto\\b)\\s*[a-z]{2,})+");

    private static final Pattern ENLACE = Pattern.compile(
        "(?:https?://|www\\.)\\S+|\\b(?:wa\\.me|t\\.me|bit\\.ly|linktr\\.ee)\\S*"
            + "|\\b[a-z0-9\\-]+\\.(?:com|net|org|ve|co|me|link|ly|app|store|shop)\\b\\S*");

    private static final Pattern USUARIO = Pattern.compile("(?<![a-z0-9])@[a-z0-9_.]{3,}");

    /** Redes, apodos de redes y frases típicas de "sácalo del chat". */
    private static final Pattern PISTAS = Pattern.compile(
        "\\b(?:whats?app|whats?ap|whats|wasap+|wassap+|guasap+|guasa|wsp|wpp|wp|w\\.a|ws|wa"
            + "|instagram|insta|ig|facebook|face|fb|messenger|telegram|telegran|tg|tiktok|tik tok|twitter|signal"
            + "|gmail|hotmail|outlook|yahoo|correo|email|e-mail|arroba|punto com"
            + "|mi numero|mi num|mi cel|mi celular|mi telefono|mi tlf|mi telf|numero de telefono|celular|telefono|tlf|telf"
            + "|llamame|llameme|llamanos|escribeme|escribame|escribenos|contactame|contacteme|contactanos"
            + "|buscame|busquenme|buscanos|busqueme|busquenos"
            + "|pagina|paginas|al privado|por privado|inbox|dm|md|por fuera|afuera del chat)\\b");

    public static Resultado filtrar(String original) {
        if (original == null || original.isBlank()) return new Resultado(original, false);
        Normalizado n = normalizar(original);
        List<int[]> tramos = new ArrayList<>();

        buscar(n, CORREO, tramos);
        buscar(n, ENLACE, tramos);
        buscar(n, USUARIO, tramos);
        buscar(n, NUMEROS_EN_LETRAS, tramos);
        buscarTelefonos(n, tramos);
        buscar(n, PISTAS, tramos);
        tramos.addAll(n.emojisContacto);

        if (tramos.isEmpty()) return new Resultado(original, false);
        return new Resultado(tapar(original, tramos), true);
    }

    private static void buscar(Normalizado n, Pattern patron, List<int[]> tramos) {
        Matcher m = patron.matcher(n.texto);
        while (m.find()) {
            if (m.end() == m.start()) continue;
            tramos.add(new int[]{n.origen[m.start()], n.fin[m.end() - 1]});
        }
    }

    private static void buscarTelefonos(Normalizado n, List<int[]> tramos) {
        Matcher m = TELEFONO.matcher(n.texto);
        while (m.find()) {
            String limpio = m.group().trim();
            long simbolos = limpio.chars().filter(c -> Character.isDigit(c) || c == 'o' || c == 'l').count();
            long digitos = limpio.chars().filter(Character::isDigit).count();
            if (simbolos < 7 || digitos < 5 || MONTO.matcher(limpio).matches()) continue;
            if (MONEDA_ANTES.matcher(n.texto.substring(Math.max(0, m.start() - 6), m.start())).find()) continue;
            if (MONEDA_DESPUES.matcher(n.texto.substring(m.end())).find()) continue;
            tramos.add(new int[]{n.origen[m.start()], n.fin[m.end() - 1]});
        }
    }

    private static String tapar(String original, List<int[]> tramos) {
        tramos.sort((a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> unidos = new ArrayList<>();
        int[] actual = null;
        for (int[] t : tramos) {
            if (actual == null || t[0] > actual[1]) { actual = new int[]{t[0], t[1]}; unidos.add(actual); }
            else actual[1] = Math.max(actual[1], t[1]);
        }
        StringBuilder sb = new StringBuilder();
        int cursor = 0;
        for (int[] t : unidos) {
            sb.append(original, cursor, t[0]).append(OCULTO);
            cursor = t[1];
        }
        sb.append(original.substring(cursor));
        return sb.toString();
    }

    /** Texto normalizado con, para cada carácter, dónde empieza y termina en el original. */
    private static final class Normalizado {
        String texto;
        int[] origen;
        int[] fin;
        final List<int[]> emojisContacto = new ArrayList<>();
    }

    private static Normalizado normalizar(String s) {
        StringBuilder out = new StringBuilder();
        List<Integer> inicios = new ArrayList<>();
        List<Integer> finales = new ArrayList<>();
        Normalizado n = new Normalizado();

        int i = 0;
        while (i < s.length()) {
            int cp = s.codePointAt(i);
            int finCp = i + Character.charCount(cp);

            // Tecla con número: "4" + (FE0F) + 20E3 → 4
            if ((cp >= '0' && cp <= '9') || cp == '#' || cp == '*') {
                int j = finCp;
                if (j < s.length() && s.charAt(j) == '️') j++;
                if (j < s.length() && s.charAt(j) == '⃣') {
                    agregar(out, inicios, finales, (char) cp, i, j + 1);
                    i = j + 1;
                    continue;
                }
            }
            if (cp == 0xFE0F || cp == 0x200B || cp == 0x200C || cp == 0x200D || cp == 0x2060 || cp == 0x20E3) {
                i = finCp; // selectores y caracteres invisibles: no aportan nada
                continue;
            }
            if (esEmojiContacto(cp)) {
                n.emojisContacto.add(new int[]{i, finCp});
                agregar(out, inicios, finales, ' ', i, finCp);
                i = finCp;
                continue;
            }
            int digito = digitoEquivalente(cp);
            if (digito >= 0) {
                agregar(out, inicios, finales, (char) ('0' + digito), i, finCp);
                i = finCp;
                continue;
            }
            String base = Normalizer.normalize(new String(Character.toChars(cp)), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase();
            for (char c : base.toCharArray()) agregar(out, inicios, finales, c, i, finCp);
            i = finCp;
        }

        n.texto = out.toString();
        n.origen = inicios.stream().mapToInt(Integer::intValue).toArray();
        n.fin = finales.stream().mapToInt(Integer::intValue).toArray();
        return n;
    }

    private static void agregar(StringBuilder out, List<Integer> inicios, List<Integer> finales, char c, int ini, int fin) {
        out.append(c);
        inicios.add(ini);
        finales.add(fin);
    }

    /** Dígitos "raros" que la gente usa para esquivar filtros; -1 si no es uno. */
    private static int digitoEquivalente(int cp) {
        if (cp >= 0xFF10 && cp <= 0xFF19) return cp - 0xFF10;          // ancho completo
        if (cp >= 0x2460 && cp <= 0x2468) return cp - 0x2460 + 1;      // ① a ⑨
        if (cp == 0x24EA || cp == 0x24FF) return 0;                    // ⓪ ⓿
        if (cp >= 0x2776 && cp <= 0x277E) return cp - 0x2776 + 1;      // ❶ a ❾
        if (cp >= 0x2780 && cp <= 0x2788) return cp - 0x2780 + 1;      // ➀ a ➈
        if (cp >= 0x278A && cp <= 0x2792) return cp - 0x278A + 1;      // ➊ a ➒
        if (cp >= 0x24F5 && cp <= 0x24FD) return cp - 0x24F5 + 1;      // ⓵ a ⓽
        if (cp >= 0x1D7CE && cp <= 0x1D7FF) return (cp - 0x1D7CE) % 10; // dígitos matemáticos (negrita, etc.)
        if (cp == 0x2070) return 0;
        if (cp == 0x00B9) return 1;
        if (cp == 0x00B2) return 2;
        if (cp == 0x00B3) return 3;
        if (cp >= 0x2074 && cp <= 0x2079) return cp - 0x2070;          // ⁴ a ⁹
        if (cp >= 0x2080 && cp <= 0x2089) return cp - 0x2080;          // ₀ a ₉
        if (cp == 0x1F100) return 0;                                   // 🄀
        if (cp >= 0x1F101 && cp <= 0x1F10A) return cp - 0x1F101;       // 🄁 a 🄊 (0, a 9,)
        return -1;
    }

    private static boolean esEmojiContacto(int cp) {
        return cp == 0x1F4DE || cp == 0x260E || cp == 0x1F4F1 || cp == 0x1F4F2 || cp == 0x2709 || cp == 0x1F4E7
            || cp == 0x1F4E9 || cp == 0x1F4E8 || cp == 0x1F4E4 || cp == 0x1F4E5 || cp == 0x1F4F3 || cp == 0x1F4DF
            || cp == 0x1F4E0 || cp == 0x1F4EC || cp == 0x1F4EB || cp == 0x1F4ED || cp == 0x1F4EA || cp == 0x1F517;
    }
}
