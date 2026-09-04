package com.auroraplus.core.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Lo que el frontend debe consultar al cargar el panel del tenant logueado
 * para saber qué módulos renderizar en el sidebar (ej: no mostrar "Horeca" ni
 * "Ganadería" a un cliente de Minería) — ver LicenciaService.obtenerModulosActivos.
 * No está en VERTICALES_CONTROLADAS así que cualquier tenant con licencia
 * activa puede consultar esto, sin importar qué módulos tenga contratados.
 */
@RestController
@RequestMapping("/api/config")
public class ModuloTenantController {

    @Autowired
    private LicenciaService licenciaService;

    @GetMapping("/mis-modulos")
    public List<String> misModulos() {
        Long tenantId = TenantContext.getCurrentTenant();
        return licenciaService.obtenerModulosActivos(tenantId);
    }
}
