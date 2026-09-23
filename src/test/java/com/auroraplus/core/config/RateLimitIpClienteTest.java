package com.auroraplus.core.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * El limitador cuenta por IP. X-Forwarded-For lo puede escribir cualquiera, así que
 * solo vale cuando la conexión viene de nuestro proxy (Caddy en la red interna).
 */
class RateLimitIpClienteTest {

    @Test
    void conexionDirectaDesdeInternetIgnoraElEncabezadoInventado() {
        assertEquals("190.202.10.5", RateLimitInterceptor.ipCliente("190.202.10.5", "1.2.3.4"));
        assertEquals("190.202.10.5", RateLimitInterceptor.ipCliente("190.202.10.5", "1.2.3.4, 5.6.7.8"));
    }

    @Test
    void detrasDeCaddyUsaLaIpQueAgregoElProxyNoLaDelCliente() {
        // Caddy en la red de Docker (172.x): la última IP es la que escribió Caddy.
        assertEquals("190.202.10.5", RateLimitInterceptor.ipCliente("172.18.0.4", "190.202.10.5"));
        assertEquals("190.202.10.5", RateLimitInterceptor.ipCliente("172.18.0.4", "9.9.9.9, 190.202.10.5"));
        assertEquals("190.202.10.5", RateLimitInterceptor.ipCliente("10.0.0.2", "190.202.10.5 , "));
    }

    @Test
    void sinEncabezadoOEnLaMismaMaquinaUsaLaIpDeLaConexion() {
        assertEquals("172.18.0.4", RateLimitInterceptor.ipCliente("172.18.0.4", null));
        assertEquals("190.202.10.5", RateLimitInterceptor.ipCliente("190.202.10.5", " "));
        assertEquals("190.202.10.5", RateLimitInterceptor.ipCliente("127.0.0.1", "190.202.10.5"));
        assertEquals("190.202.10.5", RateLimitInterceptor.ipCliente("0:0:0:0:0:0:0:1", "190.202.10.5"));
    }

    @Test
    void ipv6PublicaNoEsProxyYPrivadaSi() {
        assertEquals("2800:810:1::5", RateLimitInterceptor.ipCliente("2800:810:1::5", "1.2.3.4"));
        assertEquals("190.202.10.5", RateLimitInterceptor.ipCliente("fd00::7", "190.202.10.5"));
    }
}
