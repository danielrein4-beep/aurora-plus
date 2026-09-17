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

    /**
     * Guardia de autorización reutilizable — generaliza el patrón
     * "exigirDuenoAdmin()" que antes vivía duplicado, un método privado por
     * controlador, sin forma de reusarlo entre módulos. Lanza si el rol
     * actual (resuelto del JWT, no de nada que el cliente pueda falsificar)
     * no está entre los permitidos. No hay Spring Security en este proyecto
     * (solo spring-security-crypto para hashing) — este es el mecanismo de
     * autorización real, a llamar al inicio de cada endpoint sensible.
     */
    public static void exigirRol(String... permitidos) {
        String rol = getRol();
        for (String p : permitidos) {
            if (p.equals(rol)) return;
        }
        throw new RuntimeException("No tienes permiso para realizar esta acción (rol actual: " + rol + ")");
    }
}
