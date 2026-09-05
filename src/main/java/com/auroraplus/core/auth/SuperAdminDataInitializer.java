package com.auroraplus.core.auth;

import com.auroraplus.core.auth.repositories.UsuarioSuperAdminRepository;
import com.auroraplus.core.auth.services.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Siembra el primer super-admin al arrancar, si todavía no existe ninguno —
 * sin esto, con AuthInterceptor exigiendo ya un token válido, nadie podría
 * ENTRAR NUNCA a /api/super-admin/** para crear al primer administrador
 * (problema del huevo y la gallina). Usuario/clave configurables por variable
 * de entorno (ver .env.example) — el valor por defecto es SOLO para
 * desarrollo local y debe cambiarse antes de ir a producción.
 */
@Component
public class SuperAdminDataInitializer implements CommandLineRunner {

    @Autowired
    private UsuarioSuperAdminRepository usuarioSuperAdminRepository;

    @Autowired
    private AuthService authService;

    @Value("${SUPER_ADMIN_USERNAME:admin}")
    private String usernameInicial;

    @Value("${SUPER_ADMIN_PASSWORD:admin123}")
    private String passwordInicial;

    @Override
    public void run(String... args) {
        if (usuarioSuperAdminRepository.count() == 0) {
            authService.crearSuperAdmin(usernameInicial, passwordInicial);
        }
    }
}
