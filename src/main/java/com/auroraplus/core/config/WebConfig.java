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

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(tenantInterceptor).addPathPatterns("/api/**");
        // LicenciaInterceptor corre después de TenantInterceptor (registro posterior = orden posterior)
        // y depende de TenantContext ya resuelto. Excluye /api/super-admin/** para no bloquear
        // al propio panel que gestiona las licencias.
        registry.addInterceptor(licenciaInterceptor)
            .addPathPatterns("/api/**")
            .excludePathPatterns("/api/super-admin/**");
    }
}
