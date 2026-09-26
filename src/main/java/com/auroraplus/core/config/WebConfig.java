package com.auroraplus.core.config;

import com.auroraplus.core.auditoria.AuditoriaAutoInterceptor;
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

    @Autowired
    private AuditoriaAutoInterceptor auditoriaAutoInterceptor;

    @Autowired
    private SuperAdminAuditoriaInterceptor superAdminAuditoriaInterceptor;

    @Autowired
    private com.auroraplus.modules.pacientesapp.services.PacienteAppInterceptor pacienteAppInterceptor;

    // App de pacientes (Mediclinic Pacientes): el paciente no pertenece a ningún negocio,
    // así que estas rutas tienen su propia puerta (PacienteAppInterceptor) en vez de la del tenant.
    private static final String RUTAS_APP_PACIENTES = "/api/pacientes/v1/**";

    // SOLO estas dos rutas de /api/auth/** son públicas — es donde se consigue
    // el token en primer lugar. Todo lo demás bajo /api/auth/** (ej.
    // /api/auth/usuarios, gestión de usuarios del propio tenant) SÍ debe pasar
    // por TenantInterceptor como cualquier otro endpoint, porque necesita
    // AuthContext/TenantContext resueltos para saber quién llama y de qué rol.
    private static final String[] RUTAS_LOGIN_PUBLICAS = {
        "/api/auth/login", "/api/auth/login-super-admin", "/api/auth/login-directo", "/api/auth/registro-negocio",
        "/api/auth/olvide-clave", "/api/auth/resetear-clave",
        "/api/public/**",
        // Recuperación de clave del equipo de administración (SuperAdminRecuperacionController)
        "/api/auth/super-admin/recuperar-clave/*"
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
                "/api/auth/super-admin/recuperar-clave/*",
                "/api/public/contacto",
                // Pedidos del catálogo público: sin login, cualquiera podía llenar la bandeja de un negocio de pedidos falsos.
                "/api/public/catalogo/*/pedidos", "/api/public/catalogo/*/pedidos/*/comprobante",
                // Portal público de recepción de laboratorio (sin login, como los de
                // arriba) — sin límite, cualquiera podría martillarlo con cargas falsas.
                "/api/public/laboratorio/portal/*/subir",
                // Portal del paciente odontologico: confirmacion de identidad y subida de radiografias sin login.
                "/api/public/odontologia/portal/*/verificar",
                "/api/public/odontologia/portal/*/radiografias",
                // Entrada de la app de pacientes: cada código cuesta un WhatsApp.
                "/api/pacientes/v1/auth/*"
            );
        registry.addInterceptor(pacienteAppInterceptor)
            .addPathPatterns(RUTAS_APP_PACIENTES);
        registry.addInterceptor(tenantInterceptor)
            .addPathPatterns("/api/**")
            .excludePathPatterns(RUTAS_LOGIN_PUBLICAS)
            .excludePathPatterns(RUTAS_APP_PACIENTES);
        // LicenciaInterceptor corre después de TenantInterceptor (registro posterior = orden posterior)
        // y depende de TenantContext ya resuelto. Excluye /api/super-admin/** (gestionado por
        // token SUPER_ADMIN, sin concepto de licencia) y las rutas de login.
        registry.addInterceptor(licenciaInterceptor)
            .addPathPatterns("/api/**")
            .excludePathPatterns("/api/super-admin/**", "/api/public/**", RUTAS_LOGIN_PUBLICAS[0], RUTAS_LOGIN_PUBLICAS[1],
                RUTAS_LOGIN_PUBLICAS[2], RUTAS_LOGIN_PUBLICAS[3], RUTAS_LOGIN_PUBLICAS[4], RUTAS_LOGIN_PUBLICAS[5],
                "/api/auth/super-admin/recuperar-clave/*", RUTAS_APP_PACIENTES);
        // Registrado DESPUÉS de tenantInterceptor a propósito: Spring ejecuta afterCompletion en
        // orden inverso al de registro, así que el de auditoría corre ANTES de que
        // TenantInterceptor limpie AuthContext/TenantContext — los necesita para saber quién y
        // de qué tenant fue la acción.
        registry.addInterceptor(auditoriaAutoInterceptor)
            .addPathPatterns("/api/**")
            .excludePathPatterns("/api/super-admin/**", "/api/public/**", "/api/auditoria/**", RUTAS_APP_PACIENTES);
        // Las acciones del super admin van a su propia auditoría, con el nombre de quien las hizo.
        registry.addInterceptor(superAdminAuditoriaInterceptor)
            .addPathPatterns("/api/super-admin/**");
    }
}
