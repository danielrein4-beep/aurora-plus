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

    @Autowired
    private com.auroraplus.core.inventario.repositories.ArticuloRepository articuloRepository;

    @Autowired
    private FacturacionFiscalService facturacionFiscalService;

    @Autowired
    private com.auroraplus.modules.repuestos.repositories.RepuestoItemRepository repuestoItemRepository;

    @Autowired
    private com.auroraplus.core.financiero.repositories.MovimientoCajaRepository movimientoCajaRepository;

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
        /** Hasta cuándo tiene acceso (fin de la prueba o del período pagado). El Hub cuenta los días con esto. */
        public String fechaVencimientoPago;
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
        r.fechaVencimientoPago = licencia.getFechaVencimientoPago() != null ? licencia.getFechaVencimientoPago().toString() : null;
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

    // --- Moneda base del negocio: hasta ahora solo un super-admin podía
    // cambiarla (ver SuperAdminController.actualizar) — un negocio que
    // factura y precia todo en Bs o en COP, no en USD, necesita poder
    // elegirlo él mismo. MotorFinancieroService.obtenerMonedaBase ya lee
    // este mismo campo, así que basta con exponerlo acá para que todo el
    // motor financiero (tasas, conversiones, caja) lo respete de una.

    // EUR = "modo euro": el negocio trabaja SOLO en euros (sin bolívares, pesos ni tasas de cambio).
    private static final List<String> MONEDAS_VALIDAS = List.of("USD", "EUR", "VES", "COP");

    public static class MonedaBaseResponse {
        public String monedaBase;
        public MonedaBaseResponse(String monedaBase) { this.monedaBase = monedaBase; }
    }

    @GetMapping("/mi-negocio/moneda-base")
    public MonedaBaseResponse obtenerMonedaBase() {
        Long tenantId = TenantContext.getCurrentTenant();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));
        return new MonedaBaseResponse(licencia.getMonedaBase());
    }

    public static class ActualizarMonedaBaseRequest {
        public String monedaBase;
    }

    @PutMapping("/mi-negocio/moneda-base")
    public MonedaBaseResponse actualizarMonedaBase(@RequestBody ActualizarMonedaBaseRequest request) {
        String rol = AuthContext.getRol();
        if (!"DUENO_ADMIN".equals(rol)) {
            throw new RuntimeException("Solo el Dueño/Administrador puede cambiar la moneda principal del negocio");
        }
        if (request.monedaBase == null || !MONEDAS_VALIDAS.contains(request.monedaBase)) {
            throw new RuntimeException("Moneda inválida. Use una de: " + MONEDAS_VALIDAS);
        }
        Long tenantId = TenantContext.getCurrentTenant();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));
        // Cambiar la moneda con datos ya valorados reinterpretaría cada precio guardado (un "10" en
        // dólares pasaría a ser "10" euros sin conversión): se bloquea si hay inventario (Horeca o
        // Comercio) o movimientos de caja.
        boolean hayDatosValorados = !articuloRepository.findByTenantId(tenantId).isEmpty()
            || !repuestoItemRepository.findByTenantId(tenantId).isEmpty()
            || !movimientoCajaRepository.findByTenantIdOrderByFechaRegistroDesc(tenantId).isEmpty();
        if (!request.monedaBase.equals(licencia.getMonedaBase()) && hayDatosValorados)
            throw new IllegalStateException("Ya hay inventario o movimientos valorados en " + licencia.getMonedaBase() + ". Cambiar la moneda requiere revisar y convertir los saldos existentes.");
        licencia.setMonedaBase(request.monedaBase);
        licenciaTenantRepository.save(licencia);
        return new MonedaBaseResponse(licencia.getMonedaBase());
    }

    // --- Cuál tasa gobierna el cobro en el POS (BCV / USDT / PERSONALIZADA): decisión de
    // negocio, no una preferencia de cada navegador — antes vivía en localStorage y se
    // desincronizaba entre terminales. BCV y USDT no las escribe el negocio (se consultan
    // en vivo de su fuente pública, ver TasaExternaService); PERSONALIZADA sí.

    private static final List<String> ORIGENES_TASA_VALIDOS = List.of("BCV", "USDT", "PERSONALIZADA");

    public static class OrigenTasaResponse {
        public String origenTasaActiva;
        public OrigenTasaResponse(String origenTasaActiva) { this.origenTasaActiva = origenTasaActiva; }
    }

    @GetMapping("/mi-negocio/origen-tasa")
    public OrigenTasaResponse obtenerOrigenTasa() {
        Long tenantId = TenantContext.getCurrentTenant();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));
        return new OrigenTasaResponse(licencia.getOrigenTasaActiva());
    }

    public static class ActualizarOrigenTasaRequest {
        public String origenTasaActiva;
    }

    @PutMapping("/mi-negocio/origen-tasa")
    public OrigenTasaResponse actualizarOrigenTasa(@RequestBody ActualizarOrigenTasaRequest request) {
        String rol = AuthContext.getRol();
        if (!"DUENO_ADMIN".equals(rol)) {
            throw new RuntimeException("Solo el Dueño/Administrador puede cambiar qué tasa gobierna el cobro");
        }
        if (request.origenTasaActiva == null || !ORIGENES_TASA_VALIDOS.contains(request.origenTasaActiva)) {
            throw new RuntimeException("Origen de tasa inválido. Use uno de: " + ORIGENES_TASA_VALIDOS);
        }
        Long tenantId = TenantContext.getCurrentTenant();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));
        licencia.setOrigenTasaActiva(request.origenTasaActiva);
        licenciaTenantRepository.save(licencia);
        return new OrigenTasaResponse(licencia.getOrigenTasaActiva());
    }

    // --- Datos fiscales opcionales (RIF, razón social, domicilio fiscal) — se
    // estampan en notas de entrega/recibos de venta y despacho cuando el dueño
    // los llena; nunca bloquean la operación si quedan vacíos.

    public static class DatosFiscalesResponse {
        public String rif;
        public String razonSocial;
        public String domicilioFiscal;
    }

    @GetMapping("/mi-negocio/datos-fiscales")
    public DatosFiscalesResponse obtenerDatosFiscales() {
        Long tenantId = TenantContext.getCurrentTenant();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));
        DatosFiscalesResponse r = new DatosFiscalesResponse();
        r.rif = licencia.getRif();
        r.razonSocial = licencia.getRazonSocial();
        r.domicilioFiscal = licencia.getDomicilioFiscal();
        return r;
    }

    @PutMapping("/mi-negocio/datos-fiscales")
    public DatosFiscalesResponse actualizarDatosFiscales(@RequestBody DatosFiscalesResponse request) {
        Long tenantId = TenantContext.getCurrentTenant();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));
        licencia.setRif(request.rif);
        licencia.setRazonSocial(request.razonSocial);
        licencia.setDomicilioFiscal(request.domicilioFiscal);
        licenciaTenantRepository.save(licencia);
        return obtenerDatosFiscales();
    }

    // --- Facturación Fiscal (Formato Libre autorizado por imprenta SENIAT) —
    // apagado por defecto ("NINGUNA"). Ver FacturacionFiscalService.

    public static class FacturacionFiscalResponse {
        public String modo; // NINGUNA | FORMATO_LIBRE | MAQUINA_FISCAL
        public String serie;
        public Long numeroActual;
        public Long numeroHasta;
        public Long numerosRestantes; // null si no hay límite configurado
    }

    @GetMapping("/mi-negocio/facturacion-fiscal")
    public FacturacionFiscalResponse obtenerFacturacionFiscal() {
        Long tenantId = TenantContext.getCurrentTenant();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));
        FacturacionFiscalResponse r = new FacturacionFiscalResponse();
        r.modo = licencia.getModoFacturacionFiscal();
        r.serie = licencia.getFacturaSerie();
        r.numeroActual = licencia.getFacturaNumeroActual();
        r.numeroHasta = licencia.getFacturaNumeroHasta();
        r.numerosRestantes = (licencia.getFacturaNumeroActual() != null && licencia.getFacturaNumeroHasta() != null)
            ? licencia.getFacturaNumeroHasta() - licencia.getFacturaNumeroActual() + 1
            : null;
        return r;
    }

    public static class ActualizarFacturacionFiscalRequest {
        public String modo;
        public String serie;
        public Long numeroDesde; // solo se usa la primera vez / al recargar un rango nuevo
        public Long numeroHasta;
    }

    @PutMapping("/mi-negocio/facturacion-fiscal")
    public FacturacionFiscalResponse actualizarFacturacionFiscal(@RequestBody ActualizarFacturacionFiscalRequest request) {
        Long tenantId = TenantContext.getCurrentTenant();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));

        if (request.modo != null) {
            if (!List.of("NINGUNA", "FORMATO_LIBRE", "MAQUINA_FISCAL").contains(request.modo)) {
                throw new RuntimeException("Modo de facturación fiscal inválido");
            }
            if ("FORMATO_LIBRE".equals(request.modo)) {
                if (request.serie == null || request.serie.isBlank()) throw new RuntimeException("Falta la serie asignada por tu imprenta");
                if (request.numeroDesde == null || request.numeroHasta == null) throw new RuntimeException("Falta el rango de números de control asignado por tu imprenta");
                if (request.numeroDesde > request.numeroHasta) throw new RuntimeException("El número inicial no puede ser mayor al final");
                licencia.setFacturaSerie(request.serie.trim());
                licencia.setFacturaNumeroActual(request.numeroDesde);
                licencia.setFacturaNumeroHasta(request.numeroHasta);
            }
            licencia.setModoFacturacionFiscal(request.modo);
        }
        licenciaTenantRepository.save(licencia);
        return obtenerFacturacionFiscal();
    }

    @PostMapping("/mi-negocio/facturacion-fiscal/siguiente-numero")
    public Map<String, String> siguienteNumeroControl() {
        Long tenantId = TenantContext.getCurrentTenant();
        String numero = facturacionFiscalService.siguienteNumeroControl(tenantId);
        return numero != null ? Map.of("numeroControl", numero) : Map.of();
    }

    // --- Zonas de cocina de Horeca: antes venían fijas en el frontend
    // (COCINA/PARRILLA/BAR/COCINA_FRIA) — cada negocio arma las que
    // realmente tiene (ej. un fast-food solo "COCINA", una cevichería suma
    // "CEVICHERIA"). ItemComanda.estacionCocina ya era texto libre sin
    // restricción, así que esto no toca nada más del backend.

    private static final List<String> ZONAS_COCINA_POR_DEFECTO = List.of("COCINA", "PARRILLA", "BAR", "COCINA_FRIA");

    public static class ZonasCocinaResponse {
        public List<String> zonas;
        public ZonasCocinaResponse(List<String> zonas) { this.zonas = zonas; }
    }

    @GetMapping("/mi-negocio/zonas-cocina")
    public ZonasCocinaResponse obtenerZonasCocina() {
        Long tenantId = TenantContext.getCurrentTenant();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));
        if (licencia.getZonasCocina() == null || licencia.getZonasCocina().isBlank()) {
            return new ZonasCocinaResponse(ZONAS_COCINA_POR_DEFECTO);
        }
        return new ZonasCocinaResponse(List.of(licencia.getZonasCocina().split(",")));
    }

    public static class ActualizarZonasCocinaRequest {
        public List<String> zonas;
    }

    @PutMapping("/mi-negocio/zonas-cocina")
    public ZonasCocinaResponse actualizarZonasCocina(@RequestBody ActualizarZonasCocinaRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN");
        if (request.zonas == null || request.zonas.isEmpty()) {
            throw new RuntimeException("Debe indicar al menos una zona de cocina");
        }
        List<String> limpias = request.zonas.stream()
            .map(z -> z == null ? "" : z.trim().toUpperCase().replace(" ", "_"))
            .filter(z -> !z.isBlank())
            .distinct()
            .toList();
        if (limpias.isEmpty()) {
            throw new RuntimeException("Debe indicar al menos una zona de cocina");
        }
        Long tenantId = TenantContext.getCurrentTenant();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));
        licencia.setZonasCocina(String.join(",", limpias));
        licenciaTenantRepository.save(licencia);
        return new ZonasCocinaResponse(limpias);
    }

    // --- Zonas físicas de mesas de Horeca (Salón & Mesas): antes venían fijas
    // (SALON_PRINCIPAL/TERRAZA/BARRA) — no todo negocio tiene exactamente esas
    // 3 áreas. Mesa.zona ya era texto libre, así que esto tampoco toca nada
    // más del backend.

    private static final List<String> ZONAS_MESA_POR_DEFECTO = List.of("SALON_PRINCIPAL", "TERRAZA", "BARRA");

    public static class ZonasMesaResponse {
        public List<String> zonas;
        public ZonasMesaResponse(List<String> zonas) { this.zonas = zonas; }
    }

    @GetMapping("/mi-negocio/zonas-mesa")
    public ZonasMesaResponse obtenerZonasMesa() {
        Long tenantId = TenantContext.getCurrentTenant();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));
        if (licencia.getZonasMesa() == null || licencia.getZonasMesa().isBlank()) {
            return new ZonasMesaResponse(ZONAS_MESA_POR_DEFECTO);
        }
        return new ZonasMesaResponse(List.of(licencia.getZonasMesa().split(",")));
    }

    public static class ActualizarZonasMesaRequest {
        public List<String> zonas;
    }

    @PutMapping("/mi-negocio/zonas-mesa")
    public ZonasMesaResponse actualizarZonasMesa(@RequestBody ActualizarZonasMesaRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN");
        if (request.zonas == null || request.zonas.isEmpty()) {
            throw new RuntimeException("Debe indicar al menos una zona de mesas");
        }
        List<String> limpias = request.zonas.stream()
            .map(z -> z == null ? "" : z.trim().toUpperCase().replace(" ", "_"))
            .filter(z -> !z.isBlank())
            .distinct()
            .toList();
        if (limpias.isEmpty()) {
            throw new RuntimeException("Debe indicar al menos una zona de mesas");
        }
        Long tenantId = TenantContext.getCurrentTenant();
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado"));
        licencia.setZonasMesa(String.join(",", limpias));
        licenciaTenantRepository.save(licencia);
        return new ZonasMesaResponse(limpias);
    }
}
