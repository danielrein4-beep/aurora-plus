package com.auroraplus.modules.construccion;

import com.auroraplus.modules.construccion.services.IdempotenciaPreClaimObserver;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Implementación de prueba del observador de pre-claim.
 * Existe exclusivamente en el classpath de pruebas y solo se activa bajo el perfil 'test'.
 */
@Component
@Profile("test")
public class TestIdempotenciaPreClaimObserver implements IdempotenciaPreClaimObserver {

    private volatile Runnable delegate = () -> {};

    public void setDelegate(Runnable delegate) {
        this.delegate = delegate != null ? delegate : () -> {};
    }

    public void reset() {
        this.delegate = () -> {};
    }

    @Override
    public void onPostPreClaim() {
        delegate.run();
    }
}
