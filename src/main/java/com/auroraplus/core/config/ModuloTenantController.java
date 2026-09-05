package com.auroraplus.core.config;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @GetMapping("/mis-modulos")
    public List<String> misModulos() {
        Long tenantId = TenantContext.getCurrentTenant();
        return licenciaService.obtenerModulosActivos(tenantId);
    }

    // --- Marca del negocio: logo (cualquier vertical) y hierro (marca de propiedad del
    // ganado, específico de Ganadería) — el propio dueño los sube para SU tenant, sin
    // necesitar pasar por super-admin. Guardados como imagen en Base64 (PNG/JPG chico:
    // pensado para un logo/sello, no para fotos grandes).

    public static class MarcaResponse {
        public String nombreEmpresa;
        public String logoBase64;
        public String hierroBase64;
    }

    @GetMapping("/mi-negocio/marca")
    public MarcaResponse obtenerMarca() {
        Long tenantId = TenantContext.getCurrentTenant();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));
        MarcaResponse r = new MarcaResponse();
        r.nombreEmpresa = licencia.getNombreEmpresa();
        r.logoBase64 = licencia.getLogoBase64();
        r.hierroBase64 = licencia.getHierroBase64();
        return r;
    }

    @PutMapping("/mi-negocio/logo")
    public MarcaResponse actualizarLogo(@RequestBody Map<String, String> body) {
        Long tenantId = TenantContext.getCurrentTenant();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));
        licencia.setLogoBase64(body.get("imagenBase64"));
        licenciaTenantRepository.save(licencia);
        return obtenerMarca();
    }

    /** El "hierro": la marca de propiedad que se estampa físicamente al ganado — se refleja en la ficha de identificación del animal (ver AnimalQrService). */
    @PutMapping("/mi-negocio/hierro")
    public MarcaResponse actualizarHierro(@RequestBody Map<String, String> body) {
        Long tenantId = TenantContext.getCurrentTenant();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));
        licencia.setHierroBase64(body.get("imagenBase64"));
        licenciaTenantRepository.save(licencia);
        return obtenerMarca();
    }
}
