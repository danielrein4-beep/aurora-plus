package com.auroraplus.core.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Autowired
    private TenantInterceptor tenantInterceptor;

    @Autowired
    private LicenciaInterceptor licenciaInterceptor;

    @Autowired
    private RateLimitInterceptor rateLimitInterceptor;

    // SOLO estas dos rutas de /api/auth/** son públicas — es donde se consigue
    // el token en primer lugar. Todo lo demás bajo /api/auth/** (ej.
    // /api/auth/usuarios, gestión de usuarios del propio tenant) SÍ debe pasar
    // por TenantInterceptor como cualquier otro endpoint, porque necesita
    // AuthContext/TenantContext resueltos para saber quién llama y de qué rol.
    private static final String[] RUTAS_LOGIN_PUBLICAS = {
        "/api/auth/login", "/api/auth/login-super-admin", "/api/auth/login-directo", "/api/auth/registro-negocio",
        "/api/auth/olvide-clave", "/api/auth/resetear-clave",
        "/api/public/**"
    };

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Primero el rate limiter, y solo sobre las rutas de /api/auth/** sin
        // token — son las únicas que alguien sin ninguna sesión puede
        // martillar (login, registro, olvidé/resetear clave). El resto de la
        // API ya exige un JWT válido (ver TenantInterceptor), lo que de por
        // sí encarece mucho un abuso automatizado.
        registry.addInterceptor(rateLimitInterceptor)
            .addPathPatterns(
                "/api/auth/login", "/api/auth/login-super-admin", "/api/auth/login-directo",
                "/api/auth/registro-negocio", "/api/auth/olvide-clave", "/api/auth/resetear-clave",
                "/api/public/contacto"
            );
        registry.addInterceptor(tenantInterceptor)
            .addPathPatterns("/api/**")
            .excludePathPatterns(RUTAS_LOGIN_PUBLICAS);
        // LicenciaInterceptor corre después de TenantInterceptor (registro posterior = orden posterior)
        // y depende de TenantContext ya resuelto. Excluye /api/super-admin/** (gestionado por
        // token SUPER_ADMIN, sin concepto de licencia) y las rutas de login.
        registry.addInterceptor(licenciaInterceptor)
            .addPathPatterns("/api/**")
            .excludePathPatterns("/api/super-admin/**", "/api/public/**", RUTAS_LOGIN_PUBLICAS[0], RUTAS_LOGIN_PUBLICAS[1],
                RUTAS_LOGIN_PUBLICAS[2], RUTAS_LOGIN_PUBLICAS[3], RUTAS_LOGIN_PUBLICAS[4], RUTAS_LOGIN_PUBLICAS[5]);
    }
}
