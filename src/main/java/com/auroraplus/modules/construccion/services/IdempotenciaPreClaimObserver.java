package com.auroraplus.modules.construccion.services;

/**
 * Observador del ciclo de vida del pre-claim de idempotencia.
 * En producción se utiliza exclusivamente la implementación no-op por defecto.
 */
@FunctionalInterface
public interface IdempotenciaPreClaimObserver {
    void onPostPreClaim();
}
