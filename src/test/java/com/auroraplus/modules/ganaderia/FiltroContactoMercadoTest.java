package com.auroraplus.modules.ganaderia;

import com.auroraplus.modules.ganaderia.services.FiltroContactoMercado;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

class FiltroContactoMercadoTest {

    @ParameterizedTest
    @ValueSource(strings = {
        "llamame al 0414 123 4567",
        "mi numero es 04141234567",
        "0414-123.45.67 cualquier cosa",
        "+58 414 1234567",
        "o414 l23 4567",
        "cero cuatro catorce uno dos tres cuatro",
        "cero cuatro uno cuatro, ciento veinte, treinta y cuatro",
        "0️⃣4️⃣1️⃣4️⃣1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣",
        "④①④①②③④⑤⑥⑦",
        "０４１４１２３４５６７",
        "escribeme por wp",
        "tengo wasap",
        "búscame en ig como toros del llano",
        "en insta salgo",
        "busca la página verde de la finca",
        "estamos en face",
        "mandame un correo",
        "toros.llano@gmail.com",
        "toros llano arroba gmail punto com",
        "https://wa.me/584141234567",
        "sigueme @hacienda_el_saman",
        "te paso mi cel",
        "hablamos por privado",
        "📞 cuando quieras",
        "pasame tu tlf",
        "ESCRÍBEME POR WHATSAPP",
        "t.me/haciendasaman",
    })
    void tapaDatosDeContacto(String texto) {
        FiltroContactoMercado.Resultado r = FiltroContactoMercado.filtrar(texto);
        assertTrue(r.huboContacto(), () -> "Debió detectar contacto en: " + texto);
        assertTrue(r.texto().contains(FiltroContactoMercado.OCULTO), () -> "Debió tapar: " + texto + " -> " + r.texto());
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "te doy 1200 o 1100",
        "el toro pesa 380 kilos y tiene 24 meses",
        "precio final 1.100.000 bs",
        "te ofrezco 3500000 bolivares",
        "pago $1500 de contado",
        "tengo dos toros y tres vacas",
        "lo puede ver el sábado en la mañana",
        "buen perfil genético, hijo de un padrote Brahman registrado",
        "cuando lo busque le tengo la guía lista",
        "la vaca parió hace 3 meses, da 8 litros",
        "vacunado contra aftosa y rabia en 2026",
    })
    void dejaPasarTextoNormal(String texto) {
        FiltroContactoMercado.Resultado r = FiltroContactoMercado.filtrar(texto);
        assertFalse(r.huboContacto(), () -> "Falso positivo: " + texto + " -> " + r.texto());
        assertEquals(texto, r.texto());
    }

    @org.junit.jupiter.api.Test
    void conservaElRestoDelMensaje() {
        FiltroContactoMercado.Resultado r = FiltroContactoMercado.filtrar("Hola, llámame al 0414 123 4567 y cuadramos");
        String o = FiltroContactoMercado.OCULTO;
        assertEquals("Hola, " + o + " al " + o + " y cuadramos", r.texto());
    }
}
