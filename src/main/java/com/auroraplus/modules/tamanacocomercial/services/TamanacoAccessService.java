package com.auroraplus.modules.tamanacocomercial.services;

import com.auroraplus.core.auth.AuthContext;

/**
 * Punto único de control de acceso para las acciones sensibles de Tamanaco Comercial
 * (cambio de rol/usuarios, anular ventas, nómina, tesorería, borrados permanentes).
 * Antes de esto ningún controller del módulo validaba nada más allá del tenant — un
 * usuario con cualquier rol (incluso CAJERO_VENDEDOR) podía ascenderse a sí mismo,
 * anular ventas cobradas o disparar pagos de nómina reales. Usa el rol real resuelto
 * por AuthInterceptor a partir del JWT (AuthContext), NUNCA el campo "rol" de la
 * entidad Usuario propia de este módulo (usuarios_comercial), que es solo un
 * directorio de datos sin conexión con la autenticación real — ver su javadoc.
 */
public final class TamanacoAccessService {

    private TamanacoAccessService() {}

    /** Lanza si quien llama no es el Dueño/Administrador del tenant. */
    public static void exigirDuenoAdmin() {
        if (!"DUENO_ADMIN".equals(AuthContext.getRol())) {
            throw new RuntimeException("Solo el Dueño/Administrador puede realizar esta acción");
        }
    }
}
