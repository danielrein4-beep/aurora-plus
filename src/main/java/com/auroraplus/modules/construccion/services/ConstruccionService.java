package com.auroraplus.modules.construccion.services;

import com.auroraplus.modules.construccion.entities.*;
import com.auroraplus.modules.construccion.dtos.DashboardProyectoDTO;
import com.auroraplus.modules.construccion.repositories.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;

@Service
@Transactional
public class ConstruccionService {

    public static final Set<String> ESTADOS_PROYECTO_VALIDOS = Set.of(
            "BORRADOR", "ACTIVO", "EN_EJECUCION", "SUSPENDIDO", "PARALIZADO", "TERMINADO", "FINALIZADO", "CERRADO"
    );

    public static final Set<String> ESTADOS_VALUACION_VALIDOS = Set.of(
            "BORRADOR", "PRESENTADA", "EN_REVISION", "APROBADA", "COBRADA", "RECHAZADA", "ANULADA"
    );

    public static final Set<String> ESTADOS_DESPACHO_VALIDOS = Set.of(
            "EN_TRANSITO", "EN_BASCULA", "DESCARGANDO", "RECIBIDO", "RECHAZADO"
    );

    public static final Set<String> ESTADOS_MAQUINARIA_VALIDOS = Set.of(
            "OPERATIVO", "EN_MANTENIMIENTO", "FUERA_DE_SERVICIO", "STANDBY"
    );

    public static final Set<String> TIPOS_MAQUINARIA_VALIDOS = Set.of(
            "PESADA", "LIVIANA", "TRANSPORTE", "HERRAMIENTA_MENOR", "GENERADOR"
    );

    public static final Set<String> TIPOS_MANTENIMIENTO_VALIDOS = Set.of(
            "PREVENTIVO", "CORRECTIVO", "OVERHAUL", "INSPECCION_DIARIA"
    );

    public static final Set<String> ESTADOS_RIESGO_VALIDOS = Set.of(
            "IDENTIFICADO", "EN_MITIGACION", "CONTROLADO", "RESUELTO"
    );

    public static final Set<String> CATEGORIAS_RIESGO_VALIDAS = Set.of(
            "ALTURA", "EXCAVACION", "ELECTRICO", "MECANICO", "QUIMICO", "LOCATIVO", "BIOMECANICO", "FISICO", "OTRO"
    );

    public static final Set<String> ESTADOS_REVISION_BIM_VALIDOS = Set.of(
            "VIGENTE", "EN_REVISION", "SUPERIOR_OBSOLETO", "APROBADO_PARA_CONSTRUCCION"
    );

    public static final Set<String> DISCIPLINAS_BIM_VALIDAS = Set.of(
            "ARQUITECTURA", "ESTRUCTURAS", "INSTALACIONES_SANITARIAS", "INSTALACIONES_ELECTRICAS", "MECANICA_CLIMATIZACION", "COORDINACION_GENERAL"
    );

    public static final Set<String> FORMATOS_BIM_VALIDOS = Set.of(
            "IFC", "RVT_REVIT", "DWG_AUTOCAD", "PDF_PLANO", "NWD_NAVISWORKS", "OTRO"
    );

    public static final Set<String> ESTADOS_RFI_VALIDOS = Set.of(
            "ABIERTO", "EN_EVALUACION", "RESPONDIDO", "CERRADO"
    );

    public static final Set<String> ESTADOS_CUADRILLA_VALIDOS = Set.of(
            "ACTIVA", "EN_STANDBY", "REASIGNADA", "FINALIZADA"
    );

    public static final Set<String> ESPECIALIDADES_CUADRILLA_VALIDAS = Set.of(
            "CONCRETO_Y_ENCOFRADO", "ACERO_Y_CABILLAS", "ALBANILERIA", "MOVIMIENTO_TIERRAS",
            "INSTALACIONES_ELECTRICAS", "INSTALACIONES_SANITARIAS", "ACABADOS_Y_PINTURA", "SOLDADURA_ESTRUCTURAL", "GENERAL"
    );

    @Autowired
    private ProyectoConstruccionRepository proyectoRepository;

    @Autowired
    private CapituloConstruccionRepository capituloRepository;

    @Autowired
    private PartidaConstruccionRepository partidaRepository;

    @Autowired
    private ValuacionConstruccionRepository valuacionRepository;

    @Autowired
    private InsumoConstruccionRepository insumoRepository;

    @Autowired
    private BitacoraConstruccionRepository bitacoraRepository;

    @Autowired
    private CatalogoCoveninRepository catalogoRepository;

    @Autowired
    private DespachoConstruccionRepository despachoRepository;

    @Autowired(required = false)
    private com.auroraplus.core.financiero.repositories.TasaCambioRepository tasaCambioRepository;

    @Autowired(required = false)
    @org.springframework.beans.factory.annotation.Qualifier("personalEmpleadoRepository")
    private com.auroraplus.core.personal.repositories.EmpleadoRepository personalEmpleadoRepository;

    @Autowired
    private MaquinariaConstruccionRepository maquinariaRepository;

    @Autowired
    private MantenimientoMaquinariaRepository mantenimientoRepository;

    @Autowired
    private RiesgoConstruccionRepository riesgoRepository;

    @Autowired
    private DocumentoBimRepository documentoBimRepository;

    @Autowired
    private RfiConstruccionRepository rfiRepository;

    @Autowired
    private CuadrillaConstruccionRepository cuadrillaRepository;

    @Autowired
    private IdempotenciaConstruccionRepository idempotenciaRepository;

    @Autowired
    private IdempotenciaConstruccionService idempotenciaService;

    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    // --- UTILIDADES DE IDEMPOTENCIA Y HASHING ---
    public static String calcularSha256(String input) {
        if (input == null) return "";
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new RuntimeException("Algoritmo SHA-256 no disponible", e);
        }
    }

    private String hashPayload(String tipoRecurso, Object payload, String... camposGestionadosPorServidor) {
        try {
            Map<String, Object> serializado = objectMapper.convertValue(payload, new TypeReference<Map<String, Object>>() {});
            Map<String, Object> canonico = new TreeMap<>(serializado);
            for (String campo : camposGestionadosPorServidor) {
                canonico.remove(campo);
            }
            return calcularSha256(tipoRecurso + "|" + objectMapper.writeValueAsString(canonico));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "No se pudo validar el contenido de la solicitud para idempotencia");
        }
    }

    private <T> T restaurarResultadoIdempotente(
            IdempotenciaConstruccionEntity registro, Class<T> tipoResultado, String recurso) {
        if (registro.getResultadoJson() == null || registro.getResultadoJson().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "La respuesta previa de " + recurso + " no se puede recuperar de forma segura");
        }
        try {
            return objectMapper.readValue(registro.getResultadoJson(), tipoResultado);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "La respuesta previa de " + recurso + " está corrupta; no se reintentará la operación");
        }
    }

    private String serializarResultadoIdempotente(Object resultado, String recurso) {
        try {
            return objectMapper.writeValueAsString(resultado);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudo confirmar de forma segura la respuesta de " + recurso);
        }
    }

    private String hashValuacion(Long proyectoId, ValuacionConstruccionEntity v) {
        return hashPayload("VALUACION|" + proyectoId, v, "id", "tenantId", "proyectoId", "createdAt");
    }

    private String hashConsumo(Long insumoId, BigDecimal cantidad) {
        String data = "CONSUMO|" + insumoId + "|" + (cantidad != null ? cantidad.stripTrailingZeros().toPlainString() : "0");
        return calcularSha256(data);
    }

    private String hashBitacora(Long proyectoId, BitacoraConstruccionEntity b) {
        return hashPayload("BITACORA|" + proyectoId, b, "id", "tenantId", "proyectoId", "createdAt");
    }


    // --- PROYECTOS ---

    public List<ProyectoConstruccionEntity> listarProyectos(Long tenantId) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        return proyectoRepository.findByTenantIdOrderByIdDesc(tenantId);
    }

    public ProyectoConstruccionEntity guardarProyecto(Long tenantId, ProyectoConstruccionEntity proyecto) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        // Ignorar IDs en creación
        proyecto.setId(null);
        proyecto.setTenantId(tenantId);

        if (proyecto.getNombre() == null || proyecto.getNombre().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre del proyecto es obligatorio");
        }
        if (proyecto.getCodigo() == null || proyecto.getCodigo().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El código del proyecto es obligatorio");
        }
        if (proyecto.getMontoPresupuestoTotal() != null && proyecto.getMontoPresupuestoTotal().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El monto del presupuesto no puede ser negativo");
        }

        return proyectoRepository.save(proyecto);
    }

    
    @Transactional
    
    public void validarProyectoOperable(ProyectoConstruccionEntity proy) {
        if (proy == null) return;
        String st = proy.getEstado() != null ? proy.getEstado().trim().toUpperCase() : "BORRADOR";
        if ("SUSPENDIDO".equals(st) || "PARALIZADO".equals(st)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El proyecto se encuentra SUSPENDIDO/PARALIZADO y no admite nuevas operaciones operativas.");
        }
        if ("TERMINADO".equals(st) || "FINALIZADO".equals(st)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El proyecto se encuentra TERMINADO y no admite nuevas operaciones operativas.");
        }
        if ("CERRADO".equals(st)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El proyecto se encuentra CERRADO; sus datos son de solo lectura histórica.");
        }
    }

    public ProyectoConstruccionEntity cambiarEstadoProyecto(Long tenantId, Long proyectoId, String nuevoEstado, String motivo, String usuario) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        ProyectoConstruccionEntity proy = proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado"));

        if (nuevoEstado == null || !ESTADOS_PROYECTO_VALIDOS.contains(nuevoEstado.trim().toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado no válido para proyecto: " + nuevoEstado);
        }

        String actual = proy.getEstado() != null ? proy.getEstado().trim().toUpperCase() : "BORRADOR";
        String destino = nuevoEstado.trim().toUpperCase();

        if (actual.equals(destino)) {
            return proy;
        }

        // Validación estricta de transiciones:
        // CERRADO es inmutable
        if ("CERRADO".equals(actual)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Un proyecto CERRADO no puede cambiar de estado");
        }

        // BORRADOR solo puede pasar a ACTIVO / EN_EJECUCION o CERRADO (cancelado)
        if ("BORRADOR".equals(actual) && ("SUSPENDIDO".equals(destino) || "TERMINADO".equals(destino))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Un proyecto en BORRADOR no puede pasar directamente a " + destino + ". Debe activarse primero.");
        }

        // TERMINADO solo puede pasar a CERRADO
        if (("TERMINADO".equals(actual) || "FINALIZADO".equals(actual)) && !"CERRADO".equals(destino)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Un proyecto terminado solo puede transicionar a CERRADO");
        }

        proy.setEstado(destino);
        proy.setMotivoCambioEstado(motivo != null && !motivo.trim().isEmpty() ? motivo.trim() : "Transición a " + destino);
        proy.setFechaCambioEstado(java.time.LocalDateTime.now());
        proy.setUsuarioCambioEstado(usuario != null && !usuario.trim().isEmpty() ? usuario.trim() : "Usuario Sistema");

        return proyectoRepository.save(proy);
    }

    public DashboardProyectoDTO obtenerDashboardProyecto(Long tenantId, Long proyectoId) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        ProyectoConstruccionEntity proy = proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado"));

        List<PartidaConstruccionEntity> partidas = partidaRepository.findByTenantIdAndProyectoIdOrderByCodigoCoveninAsc(tenantId, proyectoId);
        List<ValuacionConstruccionEntity> valuaciones = valuacionRepository.findByTenantIdAndProyectoIdOrderByNumeroValuacionDesc(tenantId, proyectoId);
        List<InsumoConstruccionEntity> insumos = insumoRepository.findByTenantIdOrderByCodigoAsc(tenantId);
        List<DespachoConstruccionEntity> despachos = despachoRepository.findByTenantIdAndProyectoIdOrderByCreatedAtDesc(tenantId, proyectoId);

        BigDecimal montoPresupuestoTotal = proy.getMontoPresupuestoTotal() != null ? proy.getMontoPresupuestoTotal() : BigDecimal.ZERO;
        BigDecimal sumaPptoPartidas = BigDecimal.ZERO;
        BigDecimal sumaEjecutadoPartidas = BigDecimal.ZERO;

        int totalPartidas = partidas.size();
        int completadas = 0;
        int enEjecucion = 0;
        int sobreEjecutadas = 0;

        for (PartidaConstruccionEntity p : partidas) {
            BigDecimal cantPpto = p.getCantidadPresupuestada() != null ? p.getCantidadPresupuestada() : BigDecimal.ZERO;
            BigDecimal cantEjec = p.getCantidadEjecutadaAcumulada() != null ? p.getCantidadEjecutadaAcumulada() : BigDecimal.ZERO;
            BigDecimal pu = p.getPrecioUnitario() != null ? p.getPrecioUnitario() : BigDecimal.ZERO;

            sumaPptoPartidas = sumaPptoPartidas.add(cantPpto.multiply(pu));
            sumaEjecutadoPartidas = sumaEjecutadoPartidas.add(cantEjec.multiply(pu));

            if (cantEjec.compareTo(BigDecimal.ZERO) > 0) {
                if (cantEjec.compareTo(cantPpto) > 0) {
                    sobreEjecutadas++;
                } else if (cantEjec.compareTo(cantPpto) == 0) {
                    completadas++;
                } else {
                    enEjecucion++;
                }
            }
        }

        BigDecimal basePpto = sumaPptoPartidas.compareTo(BigDecimal.ZERO) > 0 ? sumaPptoPartidas : montoPresupuestoTotal;
        BigDecimal pctFisico = BigDecimal.ZERO;
        if (basePpto.compareTo(BigDecimal.ZERO) > 0) {
            pctFisico = sumaEjecutadoPartidas.multiply(new BigDecimal("100"))
                    .divide(basePpto, 2, java.math.RoundingMode.HALF_UP);
        }

        BigDecimal montoAprobado = BigDecimal.ZERO;
        BigDecimal montoCobrado = BigDecimal.ZERO;
        for (ValuacionConstruccionEntity v : valuaciones) {
            String st = v.getEstado() != null ? v.getEstado().toUpperCase() : "";
            BigDecimal neto = v.getMontoNetoACobrar() != null ? v.getMontoNetoACobrar() : BigDecimal.ZERO;
            if ("APROBADA".equals(st) || "COBRADA".equals(st)) {
                montoAprobado = montoAprobado.add(neto);
            }
            if ("COBRADA".equals(st)) {
                montoCobrado = montoCobrado.add(neto);
            }
        }

        BigDecimal pctFinanciero = BigDecimal.ZERO;
        if (montoPresupuestoTotal.compareTo(BigDecimal.ZERO) > 0) {
            pctFinanciero = montoAprobado.multiply(new BigDecimal("100"))
                    .divide(montoPresupuestoTotal, 2, java.math.RoundingMode.HALF_UP);
        }

        int criticos = 0;
        for (InsumoConstruccionEntity i : insumos) {
            BigDecimal actual = i.getStockActual() != null ? i.getStockActual() : BigDecimal.ZERO;
            BigDecimal minimo = i.getStockMinimo() != null ? i.getStockMinimo() : BigDecimal.ZERO;
            if (actual.compareTo(minimo) <= 0) {
                criticos++;
            }
        }

        int transito = 0;
        for (DespachoConstruccionEntity d : despachos) {
            String est = d.getEstado() != null ? d.getEstado().toUpperCase() : "";
            if ("EN_TRANSITO".equals(est) || "EN_BASCULA".equals(est) || "DESCARGANDO".equals(est)) {
                transito++;
            }
        }

        List<String> alertas = new java.util.ArrayList<>();
        if (sobreEjecutadas > 0) {
            alertas.add(sobreEjecutadas + " partida(s) exceden el 100% de la cantidad presupuestada contratada.");
        }
        if (criticos > 0) {
            alertas.add(criticos + " insumo(s) se encuentran en o por debajo del stock mínimo de seguridad.");
        }
        BigDecimal dif = pctFisico.subtract(pctFinanciero).abs();
        if (dif.compareTo(new BigDecimal("15.00")) > 0) {
            alertas.add("Desviación físico/financiera relevante del " + dif + "% entre lo ejecutado en obra y lo facturado/aprobado.");
        }
        if ("SUSPENDIDO".equals(proy.getEstado()) || "PARALIZADO".equals(proy.getEstado())) {
            alertas.add("Proyecto actualmente SUSPENDIDO/PARALIZADO: " + (proy.getMotivoCambioEstado() != null ? proy.getMotivoCambioEstado() : "Sin motivo registrado"));
        }

        DashboardProyectoDTO dto = new DashboardProyectoDTO();
        dto.setProyectoId(proy.getId());
        dto.setCodigo(proy.getCodigo());
        dto.setNombre(proy.getNombre());
        dto.setEstado(proy.getEstado());
        dto.setMontoPresupuestoTotal(montoPresupuestoTotal);
        dto.setMontoTotalEjecutado(sumaEjecutadoPartidas);
        dto.setMontoTotalCobrado(montoCobrado);
        dto.setPorcentajeAvanceFisico(pctFisico);
        dto.setPorcentajeAvanceFinanciero(pctFinanciero);
        dto.setPartidasTotales(totalPartidas);
        dto.setPartidasCompletadas(completadas);
        dto.setPartidasEnEjecucion(enEjecucion);
        dto.setPartidasSobreEjecutadas(sobreEjecutadas);
        dto.setInsumosTotales(insumos.size());
        dto.setInsumosCriticos(criticos);
        dto.setDespachosEnTransito(transito);
        dto.setAlertas(alertas);

        return dto;
    }


    public Optional<ProyectoConstruccionEntity> obtenerProyecto(Long tenantId, Long id) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        return proyectoRepository.findByTenantIdAndId(tenantId, id);
    }

    public ProyectoConstruccionEntity actualizarProyecto(Long tenantId, Long id, ProyectoConstruccionEntity datos) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        ProyectoConstruccionEntity existente = proyectoRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));

        if (datos.getNombre() != null && !datos.getNombre().trim().isEmpty()) {
            existente.setNombre(datos.getNombre().trim());
        }
        if (datos.getCodigo() != null && !datos.getCodigo().trim().isEmpty()) {
            existente.setCodigo(datos.getCodigo().trim());
        }
        if (datos.getCliente() != null) {
            existente.setCliente(datos.getCliente());
        }
        if (datos.getUbicacion() != null) {
            existente.setUbicacion(datos.getUbicacion());
        }
        if (datos.getIngenieroResidente() != null) {
            existente.setIngenieroResidente(datos.getIngenieroResidente());
        }
        if (datos.getCivResidente() != null) {
            existente.setCivResidente(datos.getCivResidente());
        }
        if (datos.getFechaInicio() != null) {
            existente.setFechaInicio(datos.getFechaInicio());
        }
        if (datos.getFechaFinEstimada() != null) {
            existente.setFechaFinEstimada(datos.getFechaFinEstimada());
        }
        if (datos.getEstado() != null) {
            existente.setEstado(datos.getEstado());
        }
        if (datos.getMontoPresupuestoTotal() != null) {
            if (datos.getMontoPresupuestoTotal().compareTo(BigDecimal.ZERO) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El monto del presupuesto no puede ser negativo");
            }
            existente.setMontoPresupuestoTotal(datos.getMontoPresupuestoTotal());
        }
        if (datos.getPorcentajeAnticipo() != null) {
            existente.setPorcentajeAnticipo(datos.getPorcentajeAnticipo());
        }
        if (datos.getPorcentajeRetencionGarantia() != null) {
            existente.setPorcentajeRetencionGarantia(datos.getPorcentajeRetencionGarantia());
        }
        if (datos.getPorcentajeAdministracion() != null) {
            existente.setPorcentajeAdministracion(datos.getPorcentajeAdministracion());
        }
        if (datos.getPorcentajeUtilidad() != null) {
            existente.setPorcentajeUtilidad(datos.getPorcentajeUtilidad());
        }
        if (datos.getIva() != null) {
            existente.setIva(datos.getIva());
        }
        return proyectoRepository.save(existente);
    }

    public void eliminarProyecto(Long tenantId, Long id) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        ProyectoConstruccionEntity existente = proyectoRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));
        proyectoRepository.delete(existente);
    }

    // --- CAPÍTULOS ---

    public List<CapituloConstruccionEntity> listarCapitulos(Long tenantId) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        return capituloRepository.findByTenantIdOrderByOrdenAsc(tenantId);
    }

    public List<CapituloConstruccionEntity> listarCapitulosPorProyecto(Long tenantId, Long proyectoId) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));
        return capituloRepository.findByTenantIdAndProyectoIdOrderByOrdenAsc(tenantId, proyectoId);
    }

    public CapituloConstruccionEntity guardarCapituloEnProyecto(Long tenantId, Long proyectoId, CapituloConstruccionEntity capitulo) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        ProyectoConstruccionEntity proy = proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));
        validarProyectoOperable(proy);
        capitulo.setId(null);
        capitulo.setTenantId(tenantId);
        capitulo.setProyectoId(proyectoId);

        if (capitulo.getNombre() == null || capitulo.getNombre().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre del capítulo es obligatorio");
        }
        if (capitulo.getCodigo() == null || capitulo.getCodigo().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El código del capítulo es obligatorio");
        }

        return capituloRepository.save(capitulo);
    }

    public CapituloConstruccionEntity guardarCapitulo(Long tenantId, CapituloConstruccionEntity capitulo) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        if (capitulo.getProyectoId() != null) {
            proyectoRepository.findByTenantIdAndId(tenantId, capitulo.getProyectoId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));
        }
        // Ignorar IDs en creación
        capitulo.setId(null);
        capitulo.setTenantId(tenantId);

        if (capitulo.getNombre() == null || capitulo.getNombre().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre del capítulo es obligatorio");
        }
        if (capitulo.getCodigo() == null || capitulo.getCodigo().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El código del capítulo es obligatorio");
        }

        return capituloRepository.save(capitulo);
    }

    // --- PARTIDAS ---

    public List<PartidaConstruccionEntity> listarPartidas(Long tenantId, Long proyectoId) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        // Validar que el proyecto pertenezca al tenant antes de listar
        proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));

        return partidaRepository.findByTenantIdAndProyectoIdOrderByCodigoCoveninAsc(tenantId, proyectoId);
    }

    public PartidaConstruccionEntity guardarPartida(Long tenantId, Long proyectoId, PartidaConstruccionEntity partida) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        // Validar que el proyecto pertenezca al tenant
        ProyectoConstruccionEntity proy = proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));
        validarProyectoOperable(proy);

        // Validar que el capítulo (si se envía) pertenezca al mismo tenant
        if (partida.getCapituloId() != null) {
            CapituloConstruccionEntity cap = capituloRepository.findByTenantIdAndId(tenantId, partida.getCapituloId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "El capítulo no existe o pertenece a otro tenant"));
            if (cap.getProyectoId() != null && !proyectoId.equals(cap.getProyectoId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "El capítulo (ID: " + cap.getId() + ") pertenece al proyecto " + cap.getProyectoId() +
                        ", no coincide con el proyecto de la partida (" + proyectoId + ")");
            }
        }

        // Rechazar cantidades y precios negativos
        if (partida.getCantidadPresupuestada() != null && partida.getCantidadPresupuestada().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad presupuestada no puede ser negativa");
        }
        if (partida.getPrecioUnitario() != null && partida.getPrecioUnitario().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El precio unitario no puede ser negativo");
        }

        // Ignorar IDs en creación
        partida.setId(null);
        partida.setTenantId(tenantId);
        partida.setProyectoId(proyectoId);

        return partidaRepository.save(partida);
    }

    public void eliminarPartida(Long tenantId, Long partidaId) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        // Buscar primero por (tenantId, id)
        PartidaConstruccionEntity partida = partidaRepository.findByTenantIdAndId(tenantId, partidaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Partida no encontrada para este tenant"));
        partidaRepository.delete(partida);
    }

    public PartidaConstruccionEntity actualizarPartida(Long tenantId, Long partidaId, PartidaConstruccionEntity datos) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        PartidaConstruccionEntity existente = partidaRepository.findByTenantIdAndId(tenantId, partidaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Partida no encontrada para este tenant"));

        if (datos.getCodigoCovenin() != null && !datos.getCodigoCovenin().trim().isEmpty()) {
            existente.setCodigoCovenin(datos.getCodigoCovenin().trim());
        }
        if (datos.getDescripcion() != null && !datos.getDescripcion().trim().isEmpty()) {
            existente.setDescripcion(datos.getDescripcion().trim());
        }
        if (datos.getUnidad() != null && !datos.getUnidad().trim().isEmpty()) {
            existente.setUnidad(datos.getUnidad().trim());
        }
        if (datos.getCantidadPresupuestada() != null) {
            if (datos.getCantidadPresupuestada().compareTo(BigDecimal.ZERO) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad presupuestada no puede ser negativa");
            }
            existente.setCantidadPresupuestada(datos.getCantidadPresupuestada());
        }
        if (datos.getPrecioUnitario() != null) {
            if (datos.getPrecioUnitario().compareTo(BigDecimal.ZERO) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El precio unitario no puede ser negativo");
            }
            existente.setPrecioUnitario(datos.getPrecioUnitario());
        }
        if (datos.getCantidadEjecutadaAcumulada() != null) {
            if (datos.getCantidadEjecutadaAcumulada().compareTo(BigDecimal.ZERO) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad ejecutada no puede ser negativa");
            }
            existente.setCantidadEjecutadaAcumulada(datos.getCantidadEjecutadaAcumulada());
        }
        if (datos.getRendimientoDiario() != null) {
            existente.setRendimientoDiario(datos.getRendimientoDiario());
        }
        if (datos.getCapituloId() != null) {
            CapituloConstruccionEntity cap = capituloRepository.findByTenantIdAndId(tenantId, datos.getCapituloId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "El capítulo no existe o pertenece a otro tenant"));
            if (cap.getProyectoId() != null && !existente.getProyectoId().equals(cap.getProyectoId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El capítulo no coincide con el proyecto de la partida");
            }
            existente.setCapituloId(datos.getCapituloId());
        }
        return partidaRepository.save(existente);
    }

    // --- VALUACIONES ---

    public List<ValuacionConstruccionEntity> listarValuaciones(Long tenantId, Long proyectoId) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        // Validar que el proyecto pertenezca al tenant antes de listar
        proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));

        return valuacionRepository.findByTenantIdAndProyectoIdOrderByNumeroValuacionDesc(tenantId, proyectoId);
    }

    public ValuacionConstruccionEntity guardarValuacion(Long tenantId, Long proyectoId, ValuacionConstruccionEntity valuacion) {
        return guardarValuacion(tenantId, proyectoId, valuacion, null);
    }

    @Transactional
    public ValuacionConstruccionEntity guardarValuacion(Long tenantId, Long proyectoId, ValuacionConstruccionEntity valuacion, String idempotencyKey) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }

        // 1. Reclamar clave ANTES del efecto de negocio
        String payloadHash = (idempotencyKey != null && !idempotencyKey.trim().isEmpty())
                ? hashValuacion(proyectoId, valuacion)
                : null;

        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<IdempotenciaConstruccionEntity> claim = idempotenciaService.reclamarClave(
                    tenantId, idempotencyKey, "VALUACION", payloadHash
            );
            if (claim.isPresent()) {
                IdempotenciaConstruccionEntity idemp = claim.get();
                if (idemp.getResultadoJson() != null && !idemp.getResultadoJson().trim().isEmpty()) {
                    return restaurarResultadoIdempotente(idemp, ValuacionConstruccionEntity.class, "la valuación");
                }
                if (idemp.getRecursoId() != null) {
                    return valuacionRepository.findByTenantIdAndId(tenantId, idemp.getRecursoId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Valuación previa no encontrada"));
                }
            }
        }

        try {
            // 2. Validar pertenencia del proyecto y campos de negocio
            ProyectoConstruccionEntity proy = proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));
            validarProyectoOperable(proy);

            if (valuacion.getEstado() == null || !ESTADOS_VALUACION_VALIDOS.contains(valuacion.getEstado().toUpperCase())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado de valuación no válido: " + valuacion.getEstado());
            }

            if (valuacion.getMontoBruto() != null && valuacion.getMontoBruto().compareTo(BigDecimal.ZERO) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El monto bruto no puede ser negativo");
            }

            valuacion.setId(null);
            valuacion.setTenantId(tenantId);
            valuacion.setProyectoId(proyectoId);
            valuacion.setEstado(valuacion.getEstado().toUpperCase());

            // 3. Ejecutar efecto de negocio
            ValuacionConstruccionEntity guardada = valuacionRepository.save(valuacion);

            // 4. Completar clave dentro de la misma transacción guardando el snapshot serializado
            String json = serializarResultadoIdempotente(guardada, "la valuación");
            idempotenciaService.completarClave(tenantId, idempotencyKey, guardada.getId(), json);

            return guardada;
        } catch (Exception ex) {
            idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
            throw ex;
        }
    }

    
    @Transactional
    public ValuacionConstruccionEntity reversarValuacion(Long tenantId, Long valuacionId, String motivo, String usuario) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        if (motivo == null || motivo.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El motivo de reverso o anulación es obligatorio");
        }

        ValuacionConstruccionEntity val = valuacionRepository.findByTenantIdAndId(tenantId, valuacionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Valuación no encontrada"));

        String estadoActual = val.getEstado() != null ? val.getEstado().toUpperCase() : "";
        if (!"APROBADA".equals(estadoActual) && !"COBRADA".equals(estadoActual)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Solo se pueden reversar valuaciones en estado APROBADA o COBRADA");
        }

        val.setEstado("ANULADA_REVERSADA");
        val.setMotivoReverso(motivo.trim());
        val.setFechaReverso(java.time.LocalDateTime.now());
        val.setObservaciones((val.getObservaciones() != null ? val.getObservaciones() + " | " : "") +
                "[REVERSADO por " + (usuario != null ? usuario : "Admin") + " el " + java.time.LocalDate.now() + ": " + motivo.trim() + "]");

        return valuacionRepository.save(val);
    }

    public Optional<ValuacionConstruccionEntity> actualizarEstadoValuacion(Long tenantId, Long valuacionId, String nuevoEstado) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        if (nuevoEstado == null || !ESTADOS_VALUACION_VALIDOS.contains(nuevoEstado.trim().toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado de valuación no permitido: " + nuevoEstado);
        }

        // Buscar primero por (tenantId, id)
        ValuacionConstruccionEntity val = valuacionRepository.findByTenantIdAndId(tenantId, valuacionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Valuación no encontrada para este tenant"));

        String actual = val.getEstado() != null ? val.getEstado().trim().toUpperCase() : "BORRADOR";
        String destino = nuevoEstado.trim().toUpperCase();

        if (actual.equals(destino)) {
            return Optional.of(val);
        }

        if ("ANULADA_REVERSADA".equals(actual)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Una valuación anulada/reversada es inmutable");
        }
        if ("COBRADA".equals(actual)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Una valuación COBRADA no puede modificarse; use reverso auditado");
        }
        if ("APROBADA".equals(actual) && !"COBRADA".equals(destino)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Una valuación APROBADA solo puede pasar a COBRADA o ser reversada");
        }
        if ("BORRADOR".equals(actual) && !"PRESENTADA".equals(destino)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Una valuación en BORRADOR solo puede pasar a PRESENTADA");
        }
        if ("PRESENTADA".equals(actual) && !"APROBADA".equals(destino) && !"RECHAZADA".equals(destino)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Una valuación PRESENTADA solo puede ser APROBADA o RECHAZADA");
        }
        if ("RECHAZADA".equals(actual) && !"BORRADOR".equals(destino)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Una valuación RECHAZADA solo puede retornar a BORRADOR para corrección");
        }

        val.setEstado(destino);
        return Optional.of(valuacionRepository.save(val));
    }

    // --- INSUMOS ---

    public List<InsumoConstruccionEntity> listarInsumos(Long tenantId) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        return insumoRepository.findByTenantIdOrderByCodigoAsc(tenantId);
    }

    public InsumoConstruccionEntity guardarInsumo(Long tenantId, InsumoConstruccionEntity insumo) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        // Validar no negatividad
        if (insumo.getStockActual() != null && insumo.getStockActual().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El stock actual no puede ser negativo");
        }
        if (insumo.getStockMinimo() != null && insumo.getStockMinimo().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El stock mínimo no puede ser negativo");
        }

        // Ignorar IDs en creación
        insumo.setId(null);
        insumo.setTenantId(tenantId);

        return insumoRepository.save(insumo);
    }

    public InsumoConstruccionEntity registrarConsumoInsumo(Long tenantId, Long insumoId, BigDecimal cantidad) {
        return registrarConsumoInsumo(tenantId, insumoId, cantidad, null);
    }

    @Transactional
    public InsumoConstruccionEntity registrarConsumoInsumo(Long tenantId, Long insumoId, BigDecimal cantidad, String idempotencyKey) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        if (cantidad == null || cantidad.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad a consumir debe ser estrictamente mayor a cero");
        }

        // 1. Reclamar clave ANTES de descontar inventario
        String payloadHash = (idempotencyKey != null && !idempotencyKey.trim().isEmpty())
                ? hashConsumo(insumoId, cantidad)
                : null;

        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<IdempotenciaConstruccionEntity> claim = idempotenciaService.reclamarClave(
                    tenantId, idempotencyKey, "CONSUMO_INSUMO", payloadHash
            );
            if (claim.isPresent()) {
                IdempotenciaConstruccionEntity idemp = claim.get();
                if (idemp.getResultadoJson() != null && !idemp.getResultadoJson().trim().isEmpty()) {
                    return restaurarResultadoIdempotente(idemp, InsumoConstruccionEntity.class, "el consumo de insumo");
                }
                return insumoRepository.findByTenantIdAndId(tenantId, insumoId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Insumo no encontrado"));
            }
        }

        try {
            // 2. Ejecutar descuento atómico (solo si stock_actual >= cantidad)
            int filasAfectadas = insumoRepository.descontarStockAtomico(tenantId, insumoId, cantidad);

            if (filasAfectadas == 0) {
                InsumoConstruccionEntity insumoExistente = insumoRepository.findByTenantIdAndId(tenantId, insumoId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Insumo no encontrado para este tenant"));

                BigDecimal stockActual = insumoExistente.getStockActual() != null ? insumoExistente.getStockActual() : BigDecimal.ZERO;
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Stock insuficiente: no se permite stock negativo (stock actual: " + stockActual + ", consumo: " + cantidad + ")");
            }

            InsumoConstruccionEntity insumoPostConsumo = insumoRepository.findByTenantIdAndId(tenantId, insumoId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Insumo no encontrado tras descuento"));

            // 3. Completar clave dentro de la misma transacción guardando el snapshot resultante del consumo
            String json = serializarResultadoIdempotente(insumoPostConsumo, "el consumo de insumo");
            idempotenciaService.completarClave(tenantId, idempotencyKey, insumoId, json);

            return insumoPostConsumo;
        } catch (Exception ex) {
            idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
            throw ex;
        }
    }

    // --- BITÁCORA ---

    public List<BitacoraConstruccionEntity> listarBitacora(Long tenantId, Long proyectoId) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        // Validar que el proyecto pertenezca al tenant
        proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));

        return bitacoraRepository.findByTenantIdAndProyectoIdOrderByFechaDesc(tenantId, proyectoId);
    }

    public BitacoraConstruccionEntity agregarEntradaBitacora(Long tenantId, Long proyectoId, BitacoraConstruccionEntity entrada) {
        return agregarEntradaBitacora(tenantId, proyectoId, entrada, null);
    }

    @Transactional
    public BitacoraConstruccionEntity agregarEntradaBitacora(Long tenantId, Long proyectoId, BitacoraConstruccionEntity entrada, String idempotencyKey) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }

        // 1. Reclamar clave ANTES de asentar en bitácora
        String payloadHash = (idempotencyKey != null && !idempotencyKey.trim().isEmpty())
                ? hashBitacora(proyectoId, entrada)
                : null;

        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<IdempotenciaConstruccionEntity> claim = idempotenciaService.reclamarClave(
                    tenantId, idempotencyKey, "BITACORA", payloadHash
            );
            if (claim.isPresent()) {
                IdempotenciaConstruccionEntity idemp = claim.get();
                if (idemp.getResultadoJson() != null && !idemp.getResultadoJson().trim().isEmpty()) {
                    return restaurarResultadoIdempotente(idemp, BitacoraConstruccionEntity.class, "la bitácora");
                }
                if (idemp.getRecursoId() != null) {
                    return bitacoraRepository.findByTenantIdAndId(tenantId, idemp.getRecursoId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bitácora previa no encontrada"));
                }
            }
        }

        try {
            // 2. Validar pertenencia del proyecto y campos
            proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));

            if (entrada.getFecha() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La fecha de la bitácora es obligatoria");
            }

            entrada.setId(null);
            entrada.setTenantId(tenantId);
            entrada.setProyectoId(proyectoId);

            // 3. Ejecutar inserción en bitácora
            BitacoraConstruccionEntity guardada = bitacoraRepository.save(entrada);

            // 4. Completar clave dentro de la misma transacción guardando el snapshot serializado
            String json = serializarResultadoIdempotente(guardada, "la bitácora");
            idempotenciaService.completarClave(tenantId, idempotencyKey, guardada.getId(), json);

            return guardada;
        } catch (Exception ex) {
            idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
            throw ex;
        }
    }

    // --- CATÁLOGO COVENIN (PÚBLICO / COMPARTIDO) ---

    public List<CatalogoCoveninEntity> buscarCatalogo(String busqueda) {
        if (busqueda == null || busqueda.trim().isEmpty()) {
            return catalogoRepository.findAll();
        }
        return catalogoRepository.findByDescripcionContainingIgnoreCaseOrCodigoCoveninContainingIgnoreCase(busqueda, busqueda);
    }

    // --- LOGÍSTICA Y DESPACHOS ---

    public List<DespachoConstruccionEntity> listarDespachos(Long tenantId, Long proyectoId) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));
        return despachoRepository.findByTenantIdAndProyectoIdOrderByCreatedAtDesc(tenantId, proyectoId);
    }

    public Optional<DespachoConstruccionEntity> obtenerDespacho(Long tenantId, Long id) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        return despachoRepository.findByTenantIdAndId(tenantId, id);
    }

    public DespachoConstruccionEntity registrarDespacho(Long tenantId, Long proyectoId, DespachoConstruccionEntity despacho) {
        return registrarDespacho(tenantId, proyectoId, despacho, null);
    }

    @Transactional
    public DespachoConstruccionEntity registrarDespacho(Long tenantId, Long proyectoId, DespachoConstruccionEntity despacho, String idempotencyKey) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        ProyectoConstruccionEntity proy = proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));
        validarProyectoOperable(proy);

        if (despacho.getGuiaNumero() == null || despacho.getGuiaNumero().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El número de guía de despacho es obligatorio");
        }
        if (despacho.getTipoMaterial() == null || despacho.getTipoMaterial().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El tipo de material es obligatorio");
        }
        if (despacho.getOrigen() == null || despacho.getOrigen().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El origen del despacho es obligatorio");
        }
        if (despacho.getDestinoFrente() == null || despacho.getDestinoFrente().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El destino/frente de obra es obligatorio");
        }
        if (despacho.getCantidad() == null || despacho.getCantidad().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad debe ser estrictamente mayor a cero");
        }
        if (despacho.getUnidadMedida() == null || despacho.getUnidadMedida().trim().isEmpty()) {
            despacho.setUnidadMedida("unidad");
        }

        // Validación de existencia y disponibilidad previa del insumo
        if (despacho.getInsumoId() != null) {
            InsumoConstruccionEntity insumo = insumoRepository.findByTenantIdAndId(tenantId, despacho.getInsumoId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "El insumo asociado no existe o pertenece a otro tenant"));

            BigDecimal stockDisp = insumo.getStockActual() != null ? insumo.getStockActual() : BigDecimal.ZERO;
            if (stockDisp.compareTo(despacho.getCantidad()) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Stock insuficiente para el insumo '" + insumo.getNombre() + "'. Stock disponible: " +
                        stockDisp + " " + insumo.getUnidad() + ", solicitado en despacho: " + despacho.getCantidad());
            }
        }

        // Moneda explícita y tasa congelada
        if (despacho.getMoneda() == null || despacho.getMoneda().trim().isEmpty()) {
            despacho.setMoneda("USD");
        } else {
            despacho.setMoneda(despacho.getMoneda().trim().toUpperCase());
        }
        if (despacho.getTasaCambioCongelada() == null && tasaCambioRepository != null) {
            tasaCambioRepository.findTopByTenantIdAndMonedaOrigenAndMonedaDestinoOrderByFechaActualizacionDesc(tenantId, "USD", "VES")
                    .ifPresent(tc -> despacho.setTasaCambioCongelada(tc.getTasa()));
        }

        if (despacho.getEstado() == null || despacho.getEstado().trim().isEmpty()) {
            despacho.setEstado("EN_TRANSITO");
        } else if (!ESTADOS_DESPACHO_VALIDOS.contains(despacho.getEstado().trim().toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado de despacho inválido: " + despacho.getEstado());
        }

        // Idempotencia: claim ANTES de aplicar descuento de inventario
        String payloadHash = (idempotencyKey != null && !idempotencyKey.trim().isEmpty())
                ? hashPayload("DESPACHO|" + proyectoId, despacho,
                        "id", "tenantId", "proyectoId", "createdAt")
                : null;

        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<IdempotenciaConstruccionEntity> claim = idempotenciaService.reclamarClave(
                    tenantId, idempotencyKey, "DESPACHO_CONSTRUCCION", payloadHash
            );
            if (claim.isPresent()) {
                IdempotenciaConstruccionEntity idemp = claim.get();
                if (idemp.getResultadoJson() != null && !idemp.getResultadoJson().trim().isEmpty()) {
                    return restaurarResultadoIdempotente(idemp, DespachoConstruccionEntity.class, "el despacho");
                }
                if (idemp.getRecursoId() != null) {
                    return despachoRepository.findByTenantIdAndId(tenantId, idemp.getRecursoId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Despacho no encontrado"));
                }
            }
        }

        try {
            // Descuento atómico de stock (si el despacho vincula un insumo)
            if (despacho.getInsumoId() != null) {
                int filasAfectadas = insumoRepository.descontarStockAtomico(tenantId, despacho.getInsumoId(), despacho.getCantidad());
                if (filasAfectadas == 0) {
                    InsumoConstruccionEntity insumo = insumoRepository.findByTenantIdAndId(tenantId, despacho.getInsumoId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Insumo no encontrado"));
                    BigDecimal stockActual = insumo.getStockActual() != null ? insumo.getStockActual() : BigDecimal.ZERO;
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Stock insuficiente: no se permite stock negativo (stock actual: " + stockActual + ", solicitado: " + despacho.getCantidad() + ")");
                }
            }

            despacho.setId(null);
            despacho.setTenantId(tenantId);
            despacho.setProyectoId(proyectoId);

            DespachoConstruccionEntity guardado = despachoRepository.save(despacho);

            if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
                String json = serializarResultadoIdempotente(guardado, "el despacho");
                idempotenciaService.completarClave(tenantId, idempotencyKey, guardado.getId(), json);
            }

            return guardado;
        } catch (Exception ex) {
            idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
            throw ex;
        }
    }

    @Transactional
    public DespachoConstruccionEntity actualizarEstadoDespacho(Long tenantId, Long despachoId, String nuevoEstado, String observaciones) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        if (nuevoEstado == null || !ESTADOS_DESPACHO_VALIDOS.contains(nuevoEstado.trim().toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado de despacho inválido: " + nuevoEstado);
        }

        DespachoConstruccionEntity despacho = despachoRepository.findByTenantIdAndId(tenantId, despachoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Despacho no encontrado para este tenant"));

        String estadoAnterior = despacho.getEstado() != null ? despacho.getEstado().trim().toUpperCase() : "";
        String estadoNuevoNorm = nuevoEstado.trim().toUpperCase();

        // Si el despacho se rechaza o anula, se reincorpora el stock al insumo de obra
        if (("RECHAZADO".equals(estadoNuevoNorm) || "ANULADO".equals(estadoNuevoNorm))
                && !"RECHAZADO".equals(estadoAnterior) && !"ANULADO".equals(estadoAnterior)
                && despacho.getInsumoId() != null) {
            insumoRepository.findByTenantIdAndId(tenantId, despacho.getInsumoId()).ifPresent(ins -> {
                BigDecimal actual = ins.getStockActual() != null ? ins.getStockActual() : BigDecimal.ZERO;
                ins.setStockActual(actual.add(despacho.getCantidad()));
                insumoRepository.save(ins);
            });
        }

        despacho.setEstado(nuevoEstado.trim().toUpperCase());
        if (observaciones != null && !observaciones.trim().isEmpty()) {
            despacho.setObservaciones(observaciones.trim());
        }
        if ("RECIBIDO".equalsIgnoreCase(nuevoEstado) && despacho.getFechaHoraLlegada() == null) {
            despacho.setFechaHoraLlegada(LocalDateTime.now());
        }

        return despachoRepository.save(despacho);
    }

    // --- MAQUINARIA Y EQUIPOS DE OBRA ---

    public List<MaquinariaConstruccionEntity> listarMaquinarias(Long tenantId, Long proyectoId) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        if (proyectoId != null) {
            proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));
            return maquinariaRepository.findByTenantIdAndProyectoIdOrderByCodigoAsc(tenantId, proyectoId);
        }
        return maquinariaRepository.findByTenantIdOrderByCodigoAsc(tenantId);
    }

    public Optional<MaquinariaConstruccionEntity> obtenerMaquinaria(Long tenantId, Long id) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        return maquinariaRepository.findByTenantIdAndId(tenantId, id);
    }

    public MaquinariaConstruccionEntity registrarMaquinaria(Long tenantId, MaquinariaConstruccionEntity req) {
        return registrarMaquinaria(tenantId, req, null);
    }

    @Transactional
    public MaquinariaConstruccionEntity registrarMaquinaria(Long tenantId, MaquinariaConstruccionEntity req, String idempotencyKey) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        if (req.getCodigo() == null || req.getCodigo().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El código del equipo o maquinaria es obligatorio");
        }
        if (req.getNombre() == null || req.getNombre().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre del equipo o maquinaria es obligatorio");
        }
        String codigoLimpio = req.getCodigo().trim().toUpperCase();

        if (req.getProyectoId() != null) {
            proyectoRepository.findByTenantIdAndId(tenantId, req.getProyectoId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "El proyecto asignado no existe o pertenece a otro tenant"));
        }

        if (req.getTipo() == null || req.getTipo().trim().isEmpty()) {
            req.setTipo("PESADA");
        } else if (!TIPOS_MAQUINARIA_VALIDOS.contains(req.getTipo().trim().toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo de maquinaria inválido: " + req.getTipo());
        } else {
            req.setTipo(req.getTipo().trim().toUpperCase());
        }

        if (req.getEstado() == null || req.getEstado().trim().isEmpty()) {
            req.setEstado("OPERATIVO");
        } else if (!ESTADOS_MAQUINARIA_VALIDOS.contains(req.getEstado().trim().toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado de maquinaria inválido: " + req.getEstado());
        } else {
            req.setEstado(req.getEstado().trim().toUpperCase());
        }

        if (req.getHorometroActual() != null && req.getHorometroActual().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El horómetro actual no puede ser negativo");
        }

        if (req.getHorometroActual() == null) req.setHorometroActual(BigDecimal.ZERO);
        if (req.getHorometroUltimoMantenimiento() == null) req.setHorometroUltimoMantenimiento(req.getHorometroActual());
        if (req.getIntervaloMantenimientoHoras() == null) req.setIntervaloMantenimientoHoras(new BigDecimal("250.00"));

        // 1. Idempotencia: si es reintento con la misma clave, retornar el recurso existente
        String payloadHash = (idempotencyKey != null && !idempotencyKey.trim().isEmpty())
                ? hashPayload("MAQUINARIA", req, "id", "tenantId", "createdAt")
                : null;

        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<IdempotenciaConstruccionEntity> claim = idempotenciaService.reclamarClave(
                    tenantId, idempotencyKey, "MAQUINARIA_CONSTRUCCION", payloadHash
            );
            if (claim.isPresent()) {
                IdempotenciaConstruccionEntity idemp = claim.get();
                if (idemp.getResultadoJson() != null && !idemp.getResultadoJson().trim().isEmpty()) {
                    return restaurarResultadoIdempotente(idemp, MaquinariaConstruccionEntity.class, "la maquinaria");
                }
                if (idemp.getRecursoId() != null) {
                    return maquinariaRepository.findByTenantIdAndId(tenantId, idemp.getRecursoId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Maquinaria no encontrada"));
                }
            }
        }

        // 2. Si no es reintento idempotente, verificar unicidad de código
        if (maquinariaRepository.findByTenantIdAndCodigo(tenantId, codigoLimpio).isPresent()) {
            if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
                idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe una maquinaria con el código " + codigoLimpio);
        }

        try {
            req.setId(null);
            req.setTenantId(tenantId);
            req.setCodigo(codigoLimpio);

            MaquinariaConstruccionEntity guardado = maquinariaRepository.save(req);

            if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
                String json = serializarResultadoIdempotente(guardado, "la maquinaria");
                idempotenciaService.completarClave(tenantId, idempotencyKey, guardado.getId(), json);
            }

            return guardado;
        } catch (Exception ex) {
            if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
                idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
            }
            throw ex;
        }
    }

    @Transactional
    public MaquinariaConstruccionEntity actualizarHorometro(Long tenantId, Long id, BigDecimal nuevoHorometro, String operador) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        if (nuevoHorometro == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nuevo horómetro es obligatorio");
        }
        MaquinariaConstruccionEntity maq = maquinariaRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Maquinaria no encontrada para este tenant"));

        if (nuevoHorometro.compareTo(maq.getHorometroActual()) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El horómetro nuevo (" + nuevoHorometro + ") no puede ser menor que el actual (" + maq.getHorometroActual() + ")");
        }

        maq.setHorometroActual(nuevoHorometro);
        if (operador != null && !operador.trim().isEmpty()) {
            maq.setOperadorResponsable(operador.trim());
        }
        return maquinariaRepository.save(maq);
    }

    @Transactional
    public MaquinariaConstruccionEntity actualizarMaquinaria(Long tenantId, Long id, MaquinariaConstruccionEntity req) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        MaquinariaConstruccionEntity maq = maquinariaRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Maquinaria no encontrada para este tenant"));

        if (req.getHorometroActual() != null) {
            if (req.getHorometroActual().compareTo(maq.getHorometroActual()) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "El horómetro actual (" + req.getHorometroActual() + ") no puede ser menor al horómetro acumulado (" + maq.getHorometroActual() + ")");
            }
            maq.setHorometroActual(req.getHorometroActual());
        }
        if (req.getProyectoId() != null) {
            ProyectoConstruccionEntity proy = proyectoRepository.findByTenantIdAndId(tenantId, req.getProyectoId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto de destino no encontrado"));
            validarProyectoOperable(proy);
            maq.setProyectoId(req.getProyectoId());
        }
        if (req.getNombre() != null && !req.getNombre().trim().isEmpty()) {
            maq.setNombre(req.getNombre().trim());
        }
        if (req.getTipo() != null && TIPOS_MAQUINARIA_VALIDOS.contains(req.getTipo().trim().toUpperCase())) {
            maq.setTipo(req.getTipo().trim().toUpperCase());
        }
        if (req.getMarca() != null) maq.setMarca(req.getMarca().trim());
        if (req.getModelo() != null) maq.setModelo(req.getModelo().trim());
        if (req.getSerialChasis() != null) maq.setSerialChasis(req.getSerialChasis().trim());
        if (req.getPlaca() != null) maq.setPlaca(req.getPlaca().trim());
        if (req.getOperadorResponsable() != null) maq.setOperadorResponsable(req.getOperadorResponsable().trim());
        if (req.getCostoHoraUsd() != null && req.getCostoHoraUsd().compareTo(BigDecimal.ZERO) >= 0) {
            maq.setCostoHoraUsd(req.getCostoHoraUsd());
        }
        if (req.getCombustibleTipo() != null) maq.setCombustibleTipo(req.getCombustibleTipo().trim());
        if (req.getCapacidadTanqueLitros() != null) maq.setCapacidadTanqueLitros(req.getCapacidadTanqueLitros());
        if (req.getConsumoPromedioLph() != null) maq.setConsumoPromedioLph(req.getConsumoPromedioLph());
        if (req.getObservaciones() != null) maq.setObservaciones(req.getObservaciones().trim());

        if (req.getEstado() != null && !req.getEstado().trim().isEmpty()) {
            String est = req.getEstado().trim().toUpperCase();
            if (!ESTADOS_MAQUINARIA_VALIDOS.contains(est)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado de maquinaria inválido: " + est);
            }
            maq.setEstado(est);
        }

        if (req.getProyectoId() != null) {
            proyectoRepository.findByTenantIdAndId(tenantId, req.getProyectoId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "El proyecto asignado no existe o pertenece a otro tenant"));
            maq.setProyectoId(req.getProyectoId());
        }

        return maquinariaRepository.save(maq);
    }

    public List<MantenimientoMaquinariaEntity> listarMantenimientos(Long tenantId, Long maquinariaId) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        maquinariaRepository.findByTenantIdAndId(tenantId, maquinariaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Maquinaria no encontrada para este tenant"));
        return mantenimientoRepository.findByTenantIdAndMaquinariaIdOrderByFechaMantenimientoDesc(tenantId, maquinariaId);
    }

    @Transactional
    public MantenimientoMaquinariaEntity registrarMantenimiento(Long tenantId, Long maquinariaId, MantenimientoMaquinariaEntity req) {
        return registrarMantenimiento(tenantId, maquinariaId, req, null);
    }

    @Transactional
    public MantenimientoMaquinariaEntity registrarMantenimiento(
            Long tenantId, Long maquinariaId, MantenimientoMaquinariaEntity req, String idempotencyKey) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        MaquinariaConstruccionEntity maq = maquinariaRepository.findByTenantIdAndId(tenantId, maquinariaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Maquinaria no encontrada para este tenant"));

        if (req.getTipo() == null || !TIPOS_MANTENIMIENTO_VALIDOS.contains(req.getTipo().trim().toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo de mantenimiento inválido");
        }
        req.setTipo(req.getTipo().trim().toUpperCase());

        if (req.getFechaMantenimiento() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La fecha de mantenimiento es obligatoria");
        }
        if (req.getDescripcionTrabajo() == null || req.getDescripcionTrabajo().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La descripción del trabajo de mantenimiento es obligatoria");
        }
        if (req.getHorometroEnMantenimiento() == null || req.getHorometroEnMantenimiento().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El horómetro en mantenimiento es obligatorio y no negativo");
        }

        String payloadHash = (idempotencyKey != null && !idempotencyKey.trim().isEmpty())
                ? hashPayload("MANTENIMIENTO|" + maquinariaId, req,
                        "id", "tenantId", "maquinariaId", "createdAt")
                : null;
        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<IdempotenciaConstruccionEntity> claim = idempotenciaService.reclamarClave(
                    tenantId, idempotencyKey, "MANTENIMIENTO_MAQUINARIA", payloadHash);
            if (claim.isPresent()) {
                return restaurarResultadoIdempotente(
                        claim.get(), MantenimientoMaquinariaEntity.class, "el mantenimiento de maquinaria");
            }
        }

        try {
            req.setId(null);
            req.setTenantId(tenantId);
            req.setMaquinariaId(maquinariaId);

            maq.setHorometroUltimoMantenimiento(req.getHorometroEnMantenimiento());
            if (req.getHorometroEnMantenimiento().compareTo(maq.getHorometroActual()) > 0) {
                maq.setHorometroActual(req.getHorometroEnMantenimiento());
            }
            if ("EN_MANTENIMIENTO".equals(maq.getEstado())) {
                maq.setEstado("OPERATIVO");
            }
            maquinariaRepository.save(maq);

            MantenimientoMaquinariaEntity guardado = mantenimientoRepository.save(req);
            if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
                idempotenciaService.completarClave(tenantId, idempotencyKey, guardado.getId(),
                        serializarResultadoIdempotente(guardado, "el mantenimiento de maquinaria"));
            }
            return guardado;
        } catch (Exception ex) {
            idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
            throw ex;
        }
    }

    // --- MATRIZ DE RIESGOS Y SEGURIDAD OCUPACIONAL (SST / IPERC) ---

    public List<RiesgoConstruccionEntity> listarRiesgos(Long tenantId, Long proyectoId) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));
        return riesgoRepository.findByTenantIdAndProyectoIdOrderByCreatedAtDesc(tenantId, proyectoId);
    }

    public Optional<RiesgoConstruccionEntity> obtenerRiesgo(Long tenantId, Long id) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        return riesgoRepository.findByTenantIdAndId(tenantId, id);
    }

    public RiesgoConstruccionEntity registrarRiesgo(Long tenantId, Long proyectoId, RiesgoConstruccionEntity req) {
        return registrarRiesgo(tenantId, proyectoId, req, null);
    }

    @Transactional
    public RiesgoConstruccionEntity registrarRiesgo(Long tenantId, Long proyectoId, RiesgoConstruccionEntity req, String idempotencyKey) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));

        if (req.getCodigo() == null || req.getCodigo().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El código del riesgo es obligatorio");
        }
        if (req.getProcesoFrente() == null || req.getProcesoFrente().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El proceso o frente de obra es obligatorio");
        }
        if (req.getPeligro() == null || req.getPeligro().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La descripción del peligro es obligatoria");
        }
        if (req.getRiesgoConsecuencia() == null || req.getRiesgoConsecuencia().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El riesgo o consecuencia potencial es obligatorio");
        }
        if (req.getMedidasControl() == null || req.getMedidasControl().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Las medidas de control preventivo son obligatorias");
        }
        if (req.getFechaEvaluacion() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La fecha de evaluación es obligatoria");
        }

        String codigoLimpio = req.getCodigo().trim().toUpperCase();

        if (req.getCategoria() == null || req.getCategoria().trim().isEmpty()) {
            req.setCategoria("OTRO");
        } else {
            req.setCategoria(req.getCategoria().trim().toUpperCase());
        }

        int prob = (req.getProbabilidad() != null && req.getProbabilidad() >= 1 && req.getProbabilidad() <= 5) ? req.getProbabilidad() : 1;
        int sev = (req.getSeveridad() != null && req.getSeveridad() >= 1 && req.getSeveridad() <= 5) ? req.getSeveridad() : 1;
        req.setProbabilidad(prob);
        req.setSeveridad(sev);

        int score = prob * sev;
        if (score >= 16) req.setNivelRiesgo("CRITICO");
        else if (score >= 10) req.setNivelRiesgo("ALTO");
        else if (score >= 5) req.setNivelRiesgo("MEDIO");
        else req.setNivelRiesgo("BAJO");

        if (req.getEstado() == null || !ESTADOS_RIESGO_VALIDOS.contains(req.getEstado().trim().toUpperCase())) {
            req.setEstado("IDENTIFICADO");
        } else {
            req.setEstado(req.getEstado().trim().toUpperCase());
        }

        // Idempotencia
        String payloadHash = (idempotencyKey != null && !idempotencyKey.trim().isEmpty())
                ? hashPayload("RIESGO|" + proyectoId, req,
                        "id", "tenantId", "proyectoId", "createdAt")
                : null;

        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<IdempotenciaConstruccionEntity> claim = idempotenciaService.reclamarClave(
                    tenantId, idempotencyKey, "RIESGO_CONSTRUCCION", payloadHash
            );
            if (claim.isPresent()) {
                IdempotenciaConstruccionEntity idemp = claim.get();
                if (idemp.getResultadoJson() != null && !idemp.getResultadoJson().trim().isEmpty()) {
                    return restaurarResultadoIdempotente(idemp, RiesgoConstruccionEntity.class, "el riesgo");
                }
                if (idemp.getRecursoId() != null) {
                    return riesgoRepository.findByTenantIdAndId(tenantId, idemp.getRecursoId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Riesgo no encontrado"));
                }
            }
        }

        // Unicidad dentro del proyecto para el tenant
        if (riesgoRepository.findByTenantIdAndProyectoIdAndCodigo(tenantId, proyectoId, codigoLimpio).isPresent()) {
            if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
                idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un riesgo con el código " + codigoLimpio + " en este proyecto");
        }

        try {
            req.setId(null);
            req.setTenantId(tenantId);
            req.setProyectoId(proyectoId);
            req.setCodigo(codigoLimpio);

            RiesgoConstruccionEntity guardado = riesgoRepository.save(req);

            if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
                String json;
                try {
                    json = objectMapper.writeValueAsString(guardado);
                } catch (Exception ex) {
                    idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
                    throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error serializando resultado de documento BIM: " + ex.getMessage(), ex);
                }
                idempotenciaService.completarClave(tenantId, idempotencyKey, guardado.getId(), json);
            }

            return guardado;
        } catch (Exception ex) {
            if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
                idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
            }
            throw ex;
        }
    }

    @Transactional
    public RiesgoConstruccionEntity actualizarEstadoRiesgo(Long tenantId, Long id, String nuevoEstado, String medidasAdicionales) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        RiesgoConstruccionEntity riesgo = riesgoRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Riesgo no encontrado para este tenant"));

        if (nuevoEstado != null && !nuevoEstado.trim().isEmpty()) {
            String est = nuevoEstado.trim().toUpperCase();
            if (!ESTADOS_RIESGO_VALIDOS.contains(est)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado de riesgo inválido: " + est);
            }
            riesgo.setEstado(est);
        }

        if (medidasAdicionales != null && !medidasAdicionales.trim().isEmpty()) {
            riesgo.setMedidasControl(riesgo.getMedidasControl() + "\n[Mitigación " + LocalDate.now() + "]: " + medidasAdicionales.trim());
        }

        return riesgoRepository.save(riesgo);
    }

    // --- GESTIÓN DOCUMENTAL BIM, MODELOS IFC Y CONTROL DE RFIs ---

    public List<DocumentoBimEntity> listarDocumentosBim(Long tenantId, Long proyectoId, String disciplina) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));

        if (disciplina != null && !disciplina.trim().isEmpty()) {
            return documentoBimRepository.findByTenantIdAndProyectoIdAndDisciplinaOrderByCodigoAsc(tenantId, proyectoId, disciplina.trim().toUpperCase());
        }
        return documentoBimRepository.findByTenantIdAndProyectoIdOrderByCodigoAsc(tenantId, proyectoId);
    }

    public Optional<DocumentoBimEntity> obtenerDocumentoBim(Long tenantId, Long id) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        return documentoBimRepository.findByTenantIdAndId(tenantId, id);
    }

    public DocumentoBimEntity registrarDocumentoBim(Long tenantId, Long proyectoId, DocumentoBimEntity req) {
        return registrarDocumentoBim(tenantId, proyectoId, req, null);
    }

    @Transactional
    public DocumentoBimEntity registrarDocumentoBim(Long tenantId, Long proyectoId, DocumentoBimEntity req, String idempotencyKey) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));

        if (req.getCodigo() == null || req.getCodigo().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El código del modelo o plano es obligatorio");
        }
        if (req.getTitulo() == null || req.getTitulo().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El título del modelo o plano es obligatorio");
        }
        if (req.getDisciplina() == null || !DISCIPLINAS_BIM_VALIDAS.contains(req.getDisciplina().trim().toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Disciplina técnica inválida: " + req.getDisciplina());
        }
        if (req.getFormato() == null || !FORMATOS_BIM_VALIDOS.contains(req.getFormato().trim().toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Formato técnico inválido: " + req.getFormato());
        }

        String codigoLimpio = req.getCodigo().trim().toUpperCase();
        String versionLimpia = (req.getVersion() != null && !req.getVersion().trim().isEmpty()) ? req.getVersion().trim() : "v1.0";

        if (req.getEstadoRevision() == null || !ESTADOS_REVISION_BIM_VALIDOS.contains(req.getEstadoRevision().trim().toUpperCase())) {
            req.setEstadoRevision("VIGENTE");
        } else {
            req.setEstadoRevision(req.getEstadoRevision().trim().toUpperCase());
        }

        // Idempotencia
        String payloadHash = (idempotencyKey != null && !idempotencyKey.trim().isEmpty())
                ? hashPayload("BIM|" + proyectoId, req,
                        "id", "tenantId", "proyectoId", "createdAt")
                : null;

        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<IdempotenciaConstruccionEntity> claim = idempotenciaService.reclamarClave(
                    tenantId, idempotencyKey, "BIM_DOCUMENTO", payloadHash
            );
            if (claim.isPresent()) {
                IdempotenciaConstruccionEntity idemp = claim.get();
                if (idemp.getResultadoJson() != null && !idemp.getResultadoJson().trim().isEmpty()) {
                    return restaurarResultadoIdempotente(idemp, DocumentoBimEntity.class, "el documento BIM");
                }
                if (idemp.getRecursoId() != null) {
                    return documentoBimRepository.findByTenantIdAndId(tenantId, idemp.getRecursoId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Documento BIM no encontrado"));
                }
            }
        }

        // Unicidad
        if (documentoBimRepository.findByTenantIdAndProyectoIdAndCodigoAndVersion(tenantId, proyectoId, codigoLimpio, versionLimpia).isPresent()) {
            if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
                idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe el documento " + codigoLimpio + " en versión " + versionLimpia + " para este proyecto");
        }

        try {
            req.setId(null);
            req.setTenantId(tenantId);
            req.setProyectoId(proyectoId);
            req.setCodigo(codigoLimpio);
            req.setVersion(versionLimpia);
            req.setDisciplina(req.getDisciplina().trim().toUpperCase());
            req.setFormato(req.getFormato().trim().toUpperCase());

            DocumentoBimEntity guardado = documentoBimRepository.save(req);

            if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
                String json;
                try {
                    json = objectMapper.writeValueAsString(guardado);
                } catch (Exception ex) {
                    idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
                    throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error serializando resultado de RFI: " + ex.getMessage(), ex);
                }
                idempotenciaService.completarClave(tenantId, idempotencyKey, guardado.getId(), json);
            }

            return guardado;
        } catch (Exception ex) {
            if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
                idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
            }
            throw ex;
        }
    }

    @Transactional
    public DocumentoBimEntity actualizarEstadoDocumentoBim(Long tenantId, Long id, String nuevoEstado) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        DocumentoBimEntity doc = documentoBimRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Documento BIM no encontrado para este tenant"));

        if (nuevoEstado != null && !nuevoEstado.trim().isEmpty()) {
            String est = nuevoEstado.trim().toUpperCase();
            if (!ESTADOS_REVISION_BIM_VALIDOS.contains(est)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado de revisión BIM inválido: " + est);
            }
            doc.setEstadoRevision(est);
        }

        return documentoBimRepository.save(doc);
    }

    // --- RFIs (CONSULTAS TÉCNICAS DE OBRA) ---

    public List<RfiConstruccionEntity> listarRfis(Long tenantId, Long proyectoId) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));
        return rfiRepository.findByTenantIdAndProyectoIdOrderByCreatedAtDesc(tenantId, proyectoId);
    }

    public Optional<RfiConstruccionEntity> obtenerRfi(Long tenantId, Long id) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        return rfiRepository.findByTenantIdAndId(tenantId, id);
    }

    public RfiConstruccionEntity registrarRfi(Long tenantId, Long proyectoId, RfiConstruccionEntity req) {
        return registrarRfi(tenantId, proyectoId, req, null);
    }

    @Transactional
    public RfiConstruccionEntity registrarRfi(Long tenantId, Long proyectoId, RfiConstruccionEntity req, String idempotencyKey) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));

        if (req.getNumeroRfi() == null || req.getNumeroRfi().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El número correlativo de RFI es obligatorio");
        }
        if (req.getAsunto() == null || req.getAsunto().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El asunto del RFI es obligatorio");
        }
        if (req.getPreguntaConsulta() == null || req.getPreguntaConsulta().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La consulta técnica es obligatoria");
        }
        if (req.getSolicitante() == null || req.getSolicitante().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El profesional solicitante es obligatorio");
        }

        if (req.getDocumentoBimId() != null) {
            documentoBimRepository.findByTenantIdAndId(tenantId, req.getDocumentoBimId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "El documento BIM asociado no existe o pertenece a otro tenant"));
        }

        String numLimpio = req.getNumeroRfi().trim().toUpperCase();

        if (req.getDisciplina() == null || req.getDisciplina().trim().isEmpty()) {
            req.setDisciplina("GENERAL");
        } else {
            req.setDisciplina(req.getDisciplina().trim().toUpperCase());
        }

        if (req.getEstado() == null || !ESTADOS_RFI_VALIDOS.contains(req.getEstado().trim().toUpperCase())) {
            req.setEstado("ABIERTO");
        } else {
            req.setEstado(req.getEstado().trim().toUpperCase());
        }

        // Idempotencia
        String payloadHash = (idempotencyKey != null && !idempotencyKey.trim().isEmpty())
                ? hashPayload("RFI|" + proyectoId, req,
                        "id", "tenantId", "proyectoId", "createdAt")
                : null;

        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<IdempotenciaConstruccionEntity> claim = idempotenciaService.reclamarClave(
                    tenantId, idempotencyKey, "RFI_CONSTRUCCION", payloadHash
            );
            if (claim.isPresent()) {
                IdempotenciaConstruccionEntity idemp = claim.get();
                if (idemp.getResultadoJson() != null && !idemp.getResultadoJson().trim().isEmpty()) {
                    return restaurarResultadoIdempotente(idemp, RfiConstruccionEntity.class, "el RFI");
                }
                if (idemp.getRecursoId() != null) {
                    return rfiRepository.findByTenantIdAndId(tenantId, idemp.getRecursoId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RFI no encontrado"));
                }
            }
        }

        // Unicidad dentro del proyecto
        if (rfiRepository.findByTenantIdAndProyectoIdAndNumeroRfi(tenantId, proyectoId, numLimpio).isPresent()) {
            if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
                idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe el RFI " + numLimpio + " en este proyecto");
        }

        try {
            req.setId(null);
            req.setTenantId(tenantId);
            req.setProyectoId(proyectoId);
            req.setNumeroRfi(numLimpio);

            RfiConstruccionEntity guardado = rfiRepository.save(req);

            if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
                String json = serializarResultadoIdempotente(guardado, "el RFI");
                idempotenciaService.completarClave(tenantId, idempotencyKey, guardado.getId(), json);
            }

            return guardado;
        } catch (Exception ex) {
            if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
                idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
            }
            throw ex;
        }
    }

    @Transactional
    public RfiConstruccionEntity responderRfi(Long tenantId, Long id, String respuestaOficial, String responsableRespuesta, String nuevoEstado) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        RfiConstruccionEntity rfi = rfiRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RFI no encontrado para este tenant"));

        if (respuestaOficial != null && !respuestaOficial.trim().isEmpty()) {
            rfi.setRespuestaOficial(respuestaOficial.trim());
            rfi.setFechaRespuesta(LocalDate.now());
        }
        if (responsableRespuesta != null && !responsableRespuesta.trim().isEmpty()) {
            rfi.setResponsableRespuesta(responsableRespuesta.trim());
        }

        if (nuevoEstado != null && !nuevoEstado.trim().isEmpty()) {
            String est = nuevoEstado.trim().toUpperCase();
            if (!ESTADOS_RFI_VALIDOS.contains(est)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado de RFI inválido: " + est);
            }
            rfi.setEstado(est);
        } else if (rfi.getRespuestaOficial() != null && "ABIERTO".equals(rfi.getEstado())) {
            rfi.setEstado("RESPONDIDO");
        }

        return rfiRepository.save(rfi);
    }

    // --- PLANIFICACIÓN DE CUADRILLAS Y FRENTES OPERATIVOS ---

    public List<CuadrillaConstruccionEntity> listarCuadrillas(Long tenantId, Long proyectoId) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));
        return cuadrillaRepository.findByTenantIdAndProyectoIdOrderByCodigoAsc(tenantId, proyectoId);
    }

    public Optional<CuadrillaConstruccionEntity> obtenerCuadrilla(Long tenantId, Long id) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        return cuadrillaRepository.findByTenantIdAndId(tenantId, id);
    }

    public CuadrillaConstruccionEntity registrarCuadrilla(Long tenantId, Long proyectoId, CuadrillaConstruccionEntity req) {
        return registrarCuadrilla(tenantId, proyectoId, req, null);
    }

    @Transactional
    public CuadrillaConstruccionEntity registrarCuadrilla(Long tenantId, Long proyectoId, CuadrillaConstruccionEntity req, String idempotencyKey) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        if (proyectoId == null || req == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Proyecto y datos de cuadrilla requeridos");
        }
        proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));

        if (req.getCodigo() == null || req.getCodigo().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El código de la cuadrilla es obligatorio");
        }
        if (req.getNombre() == null || req.getNombre().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre de la cuadrilla es obligatorio");
        }
        if (req.getFrenteTrabajo() == null || req.getFrenteTrabajo().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El frente de trabajo es obligatorio");
        }
        
        if (req.getCapatazEmpleadoId() != null && personalEmpleadoRepository != null) {
            var emp = personalEmpleadoRepository.findByTenantIdAndId(tenantId, req.getCapatazEmpleadoId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "El empleado asignado como capataz no existe o pertenece a otro tenant"));
            if (req.getCapatazResponsable() == null || req.getCapatazResponsable().trim().isEmpty()) {
                req.setCapatazResponsable(emp.getNombreCompleto());
            }
        }
        // Soporte robusto tanto para capatazResponsable como para capatazLider
        String capataz = req.getCapatazResponsable();
        if (capataz == null || capataz.trim().isEmpty()) {
            capataz = req.getCapatazLider();
        }
        if (capataz == null || capataz.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El capataz o maestro de obra responsable es obligatorio");
        }
        req.setCapatazResponsable(capataz.trim());

        if (req.getFechaInicio() == null) {
            req.setFechaInicio(java.time.LocalDate.now());
        }

        if (req.getPartidaId() != null) {
            PartidaConstruccionEntity partida = partidaRepository.findByTenantIdAndId(tenantId, req.getPartidaId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "La partida asignada no existe o pertenece a otro tenant"));
            if (!partida.getProyectoId().equals(proyectoId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La partida asignada pertenece a otro proyecto");
            }
        }

        String codigoLimpio = req.getCodigo().trim().toUpperCase();

        if (req.getEspecialidad() == null || !ESPECIALIDADES_CUADRILLA_VALIDAS.contains(req.getEspecialidad().trim().toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Especialidad de cuadrilla no válida: '" + req.getEspecialidad() + "'. Valores permitidos: " + ESPECIALIDADES_CUADRILLA_VALIDAS);
        }
        req.setEspecialidad(req.getEspecialidad().trim().toUpperCase());

        if (req.getEstado() == null || !ESTADOS_CUADRILLA_VALIDOS.contains(req.getEstado().trim().toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado de cuadrilla no válido: '" + req.getEstado() + "'. Valores permitidos: " + ESTADOS_CUADRILLA_VALIDOS);
        }
        req.setEstado(req.getEstado().trim().toUpperCase());

        int oficiales = (req.getCantidadOficiales() != null && req.getCantidadOficiales() >= 0) ? req.getCantidadOficiales() : 1;
        int ayudantes = (req.getCantidadAyudantes() != null && req.getCantidadAyudantes() >= 0) ? req.getCantidadAyudantes() : 1;
        req.setCantidadOficiales(oficiales);
        req.setCantidadAyudantes(ayudantes);
        req.setCantidadTotalPersonal(oficiales + ayudantes);

        if (req.getCantidadEjecutadaReal() != null && req.getCantidadEjecutadaReal().compareTo(BigDecimal.ZERO) > 0) {
            int divisor = (req.getPersonalReal() != null && req.getPersonalReal() > 0)
                    ? req.getPersonalReal()
                    : req.getCantidadTotalPersonal();
            if (divisor > 0) {
                req.setRendimientoReal(req.getCantidadEjecutadaReal().divide(new BigDecimal(divisor), 2, java.math.RoundingMode.HALF_UP));
            }
        }

        // Idempotencia: serialización canónica de todos los campos de negocio.
        String payloadHash = (idempotencyKey != null && !idempotencyKey.trim().isEmpty())
                ? hashPayload("CUADRILLA|" + proyectoId, req,
                        "id", "tenantId", "proyectoId", "createdAt", "cantidadTotalPersonal")
                : null;

        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<IdempotenciaConstruccionEntity> claim = idempotenciaService.reclamarClave(
                    tenantId, idempotencyKey, "CUADRILLA_CONSTRUCCION", payloadHash
            );
            if (claim.isPresent()) {
                IdempotenciaConstruccionEntity idemp = claim.get();
                if (idemp.getResultadoJson() != null && !idemp.getResultadoJson().trim().isEmpty()) {
                    return restaurarResultadoIdempotente(idemp, CuadrillaConstruccionEntity.class, "la cuadrilla");
                }
                if (idemp.getRecursoId() != null) {
                    return cuadrillaRepository.findByTenantIdAndId(tenantId, idemp.getRecursoId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cuadrilla no encontrada"));
                }
            }
        }

        try {
            // Unicidad dentro del proyecto
            if (cuadrillaRepository.findByTenantIdAndProyectoIdAndCodigo(tenantId, proyectoId, codigoLimpio).isPresent()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe una cuadrilla con el código " + codigoLimpio + " en este proyecto");
            }

            req.setId(null);
            req.setTenantId(tenantId);
            req.setProyectoId(proyectoId);
            req.setCodigo(codigoLimpio);

            CuadrillaConstruccionEntity guardado = cuadrillaRepository.save(req);

            if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
                String json;
                try {
                    json = objectMapper.writeValueAsString(guardado);
                } catch (Exception ex) {
                    idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
                    throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error serializando resultado de idempotencia: " + ex.getMessage(), ex);
                }
                idempotenciaService.completarClave(tenantId, idempotencyKey, guardado.getId(), json);
            }

            return guardado;
        } catch (Exception ex) {
            if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
                idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
            }
            throw ex;
        }
    }

    @Transactional
    public CuadrillaConstruccionEntity actualizarEstadoCuadrilla(Long tenantId, Long id, String nuevoEstado, String nuevoFrente) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }

        CuadrillaConstruccionEntity cuadrilla = cuadrillaRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cuadrilla no encontrada"));

        if (nuevoEstado != null && !nuevoEstado.trim().isEmpty()) {
            String est = nuevoEstado.trim().toUpperCase();
            if (!ESTADOS_CUADRILLA_VALIDOS.contains(est)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado no válido para cuadrilla: '" + nuevoEstado + "'. Valores permitidos: " + ESTADOS_CUADRILLA_VALIDOS);
            }
            cuadrilla.setEstado(est);
        }

        if (nuevoFrente != null && !nuevoFrente.trim().isEmpty()) {
            cuadrilla.setFrenteTrabajo(nuevoFrente.trim());
        }

        return cuadrillaRepository.save(cuadrilla);
    }

    @Transactional
    public CuadrillaConstruccionEntity actualizarCuadrilla(Long tenantId, Long id, CuadrillaConstruccionEntity req) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        if (id == null || req == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Datos incompletos para actualizar cuadrilla");
        }

        CuadrillaConstruccionEntity cuadrilla = cuadrillaRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cuadrilla no encontrada"));

        if (req.getCapatazEmpleadoId() != null) {
            if (personalEmpleadoRepository != null) {
                var emp = personalEmpleadoRepository.findByTenantIdAndId(tenantId, req.getCapatazEmpleadoId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "El empleado asignado como capataz no existe o pertenece a otro tenant"));
                cuadrilla.setCapatazEmpleadoId(req.getCapatazEmpleadoId());
                if (req.getCapatazResponsable() == null || req.getCapatazResponsable().trim().isEmpty()) {
                    cuadrilla.setCapatazResponsable(emp.getNombreCompleto());
                }
            } else {
                cuadrilla.setCapatazEmpleadoId(req.getCapatazEmpleadoId());
            }
        }
        if (req.getCapatazResponsable() != null && !req.getCapatazResponsable().trim().isEmpty()) {
            cuadrilla.setCapatazResponsable(req.getCapatazResponsable().trim());
        }
        if (req.getNombre() != null && !req.getNombre().trim().isEmpty()) {
            cuadrilla.setNombre(req.getNombre().trim());
        }
        if (req.getFrenteTrabajo() != null && !req.getFrenteTrabajo().trim().isEmpty()) {
            cuadrilla.setFrenteTrabajo(req.getFrenteTrabajo().trim());
        }
        if (req.getEspecialidad() != null && !req.getEspecialidad().trim().isEmpty()) {
            String esp = req.getEspecialidad().trim().toUpperCase();
            if (!ESPECIALIDADES_CUADRILLA_VALIDAS.contains(esp)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Especialidad de cuadrilla no válida: '" + req.getEspecialidad() + "'. Valores permitidos: " + ESPECIALIDADES_CUADRILLA_VALIDAS);
            }
            cuadrilla.setEspecialidad(esp);
        }
        if (req.getEstado() != null && !req.getEstado().trim().isEmpty()) {
            String est = req.getEstado().trim().toUpperCase();
            if (!ESTADOS_CUADRILLA_VALIDOS.contains(est)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado no válido para cuadrilla: '" + req.getEstado() + "'. Valores permitidos: " + ESTADOS_CUADRILLA_VALIDOS);
            }
            cuadrilla.setEstado(est);
        }
        if (req.getCantidadOficiales() != null && req.getCantidadOficiales() >= 0) {
            cuadrilla.setCantidadOficiales(req.getCantidadOficiales());
        }
        if (req.getCantidadAyudantes() != null && req.getCantidadAyudantes() >= 0) {
            cuadrilla.setCantidadAyudantes(req.getCantidadAyudantes());
        }
        cuadrilla.setCantidadTotalPersonal(cuadrilla.getCantidadOficiales() + cuadrilla.getCantidadAyudantes());

        if (req.getPersonalReal() != null && req.getPersonalReal() >= 0) {
            cuadrilla.setPersonalReal(req.getPersonalReal());
        }
        if (req.getCantidadEjecutadaReal() != null) {
            cuadrilla.setCantidadEjecutadaReal(req.getCantidadEjecutadaReal());
        }
        if (cuadrilla.getCantidadEjecutadaReal() != null && cuadrilla.getCantidadEjecutadaReal().compareTo(BigDecimal.ZERO) > 0) {
            int divisor = (cuadrilla.getPersonalReal() != null && cuadrilla.getPersonalReal() > 0)
                    ? cuadrilla.getPersonalReal()
                    : cuadrilla.getCantidadTotalPersonal();
            if (divisor > 0) {
                cuadrilla.setRendimientoReal(cuadrilla.getCantidadEjecutadaReal().divide(new BigDecimal(divisor), 2, java.math.RoundingMode.HALF_UP));
            }
        }
        if (req.getCostoJornalMonto() != null) {
            cuadrilla.setCostoJornalMonto(req.getCostoJornalMonto());
        }
        if (req.getCostoJornalMoneda() != null && !req.getCostoJornalMoneda().trim().isEmpty()) {
            cuadrilla.setCostoJornalMoneda(req.getCostoJornalMoneda().trim().toUpperCase());
        }
        if (req.getObservaciones() != null) {
            cuadrilla.setObservaciones(req.getObservaciones());
        }
        return cuadrillaRepository.save(cuadrilla);
    }
}
