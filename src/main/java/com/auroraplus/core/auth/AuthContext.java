package com.auroraplus.core.auth;

/**
 * Quién está haciendo la request actual, resuelto por AuthInterceptor a partir
 * del JWT verificado — no de nada que el cliente pueda falsificar. Vive junto
 * a TenantContext (core.config) durante el ciclo de vida de la request.
 */
public class AuthContext {

    private static final ThreadLocal<String> usernameActual = new ThreadLocal<>();
    private static final ThreadLocal<String> rolActual = new ThreadLocal<>();

    public static void set(String username, String rol) {
        usernameActual.set(username);
        rolActual.set(rol);
    }

    public static String getUsername() {
        return usernameActual.get();
    }

    public static String getRol() {
        return rolActual.get();
    }

    public static void clear() {
        usernameActual.remove();
        rolActual.remove();
    }
}
