package com.auroraplus.core.config;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.entities.ModuloTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.config.repositories.ModuloTenantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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

    @Autowired
    private ModuloTenantRepository moduloTenantRepository;

    @GetMapping("/mis-modulos")
    public List<String> misModulos() {
        Long tenantId = TenantContext.getCurrentTenant();
        return licenciaService.obtenerModulosActivos(tenantId);
    }

    public static class AgregarModuloRequest {
        public String moduloNombre; // ej: "horeca", "salud" — mismo valor que en la URL /api/{modulo}/...
    }

    /**
     * Contrata una vertical adicional para el negocio YA existente, sin crear
     * un tenant nuevo — a diferencia del registro de autoservicio (que solo
     * asigna un módulo al nacer el tenant), esto permite que un cliente de
     * Mediclinic (salud) sume Aurora Horeca sobre la misma cuenta, o
     * viceversa. Requiere que la licencia del negocio ya alcance el nivel que
     * exige ese módulo (ver LicenciaService.NIVEL_REQUERIDO_POR_MODULO) — no
     * se sube de nivel de licencia automáticamente aquí, solo se valida.
     */
    @PostMapping("/mi-negocio/agregar-modulo")
    public ResponseEntity<ModuloTenant> agregarModulo(@RequestBody AgregarModuloRequest request) {
        String rol = AuthContext.getRol();
        if (!"DUENO_ADMIN".equals(rol) && !"MEDICO".equals(rol)) {
            throw new RuntimeException("Solo el Dueño/Administrador puede contratar módulos adicionales para este negocio");
        }
        if (request.moduloNombre == null || request.moduloNombre.isBlank()) {
            throw new RuntimeException("Debe indicar el módulo a agregar");
        }
        if (!licenciaService.esVerticalControlada(request.moduloNombre)) {
            throw new RuntimeException("Módulo desconocido o no disponible para contratación: " + request.moduloNombre);
        }

        Long tenantId = TenantContext.getCurrentTenant();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));
        if (!licencia.isActiva()) {
            throw new RuntimeException("La licencia de este negocio está desactivada. Regularice el pago antes de contratar módulos nuevos.");
        }

        LicenciaTenant.TipoLicencia nivelRequerido = licenciaService.nivelRequeridoPara(request.moduloNombre);
        if (licencia.getTipoLicencia().ordinal() < nivelRequerido.ordinal()) {
            throw new RuntimeException("Su licencia actual (" + licencia.getTipoLicencia() + ") no alcanza para el módulo '"
                + request.moduloNombre + "'. Se requiere " + nivelRequerido + " o superior — contacte a ventas para actualizar su plan.");
        }

        ModuloTenant existente = moduloTenantRepository.findByTenantIdAndModuloNombre(tenantId, request.moduloNombre).orElse(null);
        if (existente != null) {
            if (existente.isActivo()) {
                throw new RuntimeException("Este negocio ya tiene contratado el módulo '" + request.moduloNombre + "'");
            }
            existente.setActivo(true);
            return ResponseEntity.ok(moduloTenantRepository.save(existente));
        }

        ModuloTenant nuevo = new ModuloTenant();
        nuevo.setTenantId(tenantId);
        nuevo.setModuloNombre(request.moduloNombre);
        nuevo.setActivo(true);
        return ResponseEntity.ok(moduloTenantRepository.save(nuevo));
    }

    // --- Marca del negocio: logo (cualquier vertical) y hierro (marca de propiedad del
    // ganado, específico de Ganadería) — el propio dueño los sube para SU tenant, sin
    // necesitar pasar por super-admin. Guardados como imagen en Base64 (PNG/JPG chico:
    // pensado para un logo/sello, no para fotos grandes).

    public static class MarcaResponse {
        public String nombreEmpresa;
        public String moduloPrincipal;
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
        r.moduloPrincipal = licencia.getModuloPrincipal();
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
