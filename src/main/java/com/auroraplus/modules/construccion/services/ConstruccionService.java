package com.auroraplus.modules.construccion.services;

import com.auroraplus.modules.construccion.entities.*;
import com.auroraplus.modules.construccion.repositories.*;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.Optional;
import java.util.Set;

@Service
@Transactional
public class ConstruccionService {

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

    private String hashValuacion(Long proyectoId, ValuacionConstruccionEntity v) {
        String data = "VAL|" + proyectoId + "|" + v.getNumeroValuacion() + "|" + v.getPeriodoDesde() + "|" +
                v.getPeriodoHasta() + "|" + (v.getMontoBruto() != null ? v.getMontoBruto().stripTrailingZeros().toPlainString() : "0");
        return calcularSha256(data);
    }

    private String hashConsumo(Long insumoId, BigDecimal cantidad) {
        String data = "CONSUMO|" + insumoId + "|" + (cantidad != null ? cantidad.stripTrailingZeros().toPlainString() : "0");
        return calcularSha256(data);
    }

    private String hashBitacora(Long proyectoId, BitacoraConstruccionEntity b) {
        String data = "BITACORA|" + proyectoId + "|" + b.getFecha() + "|" + (b.getClima() != null ? b.getClima().trim().toUpperCase() : "") + "|" +
                b.getPersonalActivo() + "|" + (b.getActividadesEjecutadas() != null ? b.getActividadesEjecutadas().trim() : "");
        return calcularSha256(data);
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
        proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));
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
        proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));

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
                    try {
                        return objectMapper.readValue(idemp.getResultadoJson(), ValuacionConstruccionEntity.class);
                    } catch (Exception ignored) {}
                }
                if (idemp.getRecursoId() != null) {
                    return valuacionRepository.findByTenantIdAndId(tenantId, idemp.getRecursoId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Valuación previa no encontrada"));
                }
            }
        }

        try {
            // 2. Validar pertenencia del proyecto y campos de negocio
            proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));

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
            String json = null;
            try {
                json = objectMapper.writeValueAsString(guardada);
            } catch (Exception ignored) {}
            idempotenciaService.completarClave(tenantId, idempotencyKey, guardada.getId(), json);

            return guardada;
        } catch (Exception ex) {
            idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
            throw ex;
        }
    }

    public Optional<ValuacionConstruccionEntity> actualizarEstadoValuacion(Long tenantId, Long valuacionId, String nuevoEstado) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        if (nuevoEstado == null || !ESTADOS_VALUACION_VALIDOS.contains(nuevoEstado.toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado de valuación arbitrario no permitido: " + nuevoEstado);
        }

        // Buscar primero por (tenantId, id)
        ValuacionConstruccionEntity val = valuacionRepository.findByTenantIdAndId(tenantId, valuacionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Valuación no encontrada para este tenant"));

        val.setEstado(nuevoEstado.toUpperCase());
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
                    try {
                        return objectMapper.readValue(idemp.getResultadoJson(), InsumoConstruccionEntity.class);
                    } catch (Exception ignored) {}
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
            String json = null;
            try {
                json = objectMapper.writeValueAsString(insumoPostConsumo);
            } catch (Exception ignored) {}
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
                    try {
                        return objectMapper.readValue(idemp.getResultadoJson(), BitacoraConstruccionEntity.class);
                    } catch (Exception ignored) {}
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
            String json = null;
            try {
                json = objectMapper.writeValueAsString(guardada);
            } catch (Exception ignored) {}
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
        proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));

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
        if (despacho.getCantidad() != null && despacho.getCantidad().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad no puede ser negativa");
        }

        if (despacho.getInsumoId() != null) {
            insumoRepository.findByTenantIdAndId(tenantId, despacho.getInsumoId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "El insumo asociado no existe o pertenece a otro tenant"));
        }

        if (despacho.getEstado() == null || despacho.getEstado().trim().isEmpty()) {
            despacho.setEstado("EN_TRANSITO");
        } else if (!ESTADOS_DESPACHO_VALIDOS.contains(despacho.getEstado().trim().toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado de despacho inválido: " + despacho.getEstado());
        }

        // Idempotencia
        String payloadHash = (idempotencyKey != null && !idempotencyKey.trim().isEmpty())
                ? calcularSha256(despacho.getGuiaNumero() + ":" + despacho.getCantidad() + ":" + proyectoId)
                : null;

        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<IdempotenciaConstruccionEntity> claim = idempotenciaService.reclamarClave(
                    tenantId, idempotencyKey, "DESPACHO_CONSTRUCCION", payloadHash
            );
            if (claim.isPresent()) {
                IdempotenciaConstruccionEntity idemp = claim.get();
                if (idemp.getResultadoJson() != null && !idemp.getResultadoJson().trim().isEmpty()) {
                    try {
                        return objectMapper.readValue(idemp.getResultadoJson(), DespachoConstruccionEntity.class);
                    } catch (Exception ignored) {}
                }
                if (idemp.getRecursoId() != null) {
                    return despachoRepository.findByTenantIdAndId(tenantId, idemp.getRecursoId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Despacho no encontrado"));
                }
            }
        }

        try {
            despacho.setId(null);
            despacho.setTenantId(tenantId);
            despacho.setProyectoId(proyectoId);

            DespachoConstruccionEntity guardado = despachoRepository.save(despacho);

            if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
                String json = null;
                try {
                    json = objectMapper.writeValueAsString(guardado);
                } catch (Exception ignored) {}
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

        // 1. Idempotencia: si es reintento con la misma clave, retornar el recurso existente
        String payloadHash = (idempotencyKey != null && !idempotencyKey.trim().isEmpty())
                ? calcularSha256("MAQ|" + codigoLimpio + "|" + req.getTipo() + "|" + req.getHorometroActual())
                : null;

        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<IdempotenciaConstruccionEntity> claim = idempotenciaService.reclamarClave(
                    tenantId, idempotencyKey, "MAQUINARIA_CONSTRUCCION", payloadHash
            );
            if (claim.isPresent()) {
                IdempotenciaConstruccionEntity idemp = claim.get();
                if (idemp.getResultadoJson() != null && !idemp.getResultadoJson().trim().isEmpty()) {
                    try {
                        return objectMapper.readValue(idemp.getResultadoJson(), MaquinariaConstruccionEntity.class);
                    } catch (Exception ignored) {}
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
            if (req.getHorometroActual() == null) req.setHorometroActual(BigDecimal.ZERO);
            if (req.getHorometroUltimoMantenimiento() == null) req.setHorometroUltimoMantenimiento(req.getHorometroActual());
            if (req.getIntervaloMantenimientoHoras() == null) req.setIntervaloMantenimientoHoras(new BigDecimal("250.00"));

            MaquinariaConstruccionEntity guardado = maquinariaRepository.save(req);

            if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
                String json = null;
                try {
                    json = objectMapper.writeValueAsString(guardado);
                } catch (Exception ignored) {}
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

        req.setId(null);
        req.setTenantId(tenantId);
        req.setMaquinariaId(maquinariaId);

        // Actualizar datos de mantenimiento en la ficha de la máquina
        maq.setHorometroUltimoMantenimiento(req.getHorometroEnMantenimiento());
        if (req.getHorometroEnMantenimiento().compareTo(maq.getHorometroActual()) > 0) {
            maq.setHorometroActual(req.getHorometroEnMantenimiento());
        }
        if ("EN_MANTENIMIENTO".equals(maq.getEstado())) {
            maq.setEstado("OPERATIVO");
        }
        maquinariaRepository.save(maq);

        return mantenimientoRepository.save(req);
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
                ? calcularSha256("RIESGO|" + proyectoId + "|" + codigoLimpio + "|" + score)
                : null;

        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<IdempotenciaConstruccionEntity> claim = idempotenciaService.reclamarClave(
                    tenantId, idempotencyKey, "RIESGO_CONSTRUCCION", payloadHash
            );
            if (claim.isPresent()) {
                IdempotenciaConstruccionEntity idemp = claim.get();
                if (idemp.getResultadoJson() != null && !idemp.getResultadoJson().trim().isEmpty()) {
                    try {
                        return objectMapper.readValue(idemp.getResultadoJson(), RiesgoConstruccionEntity.class);
                    } catch (Exception ignored) {}
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
                String json = null;
                try {
                    json = objectMapper.writeValueAsString(guardado);
                } catch (Exception ignored) {}
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
                ? calcularSha256("BIM|" + proyectoId + "|" + codigoLimpio + "|" + versionLimpia)
                : null;

        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<IdempotenciaConstruccionEntity> claim = idempotenciaService.reclamarClave(
                    tenantId, idempotencyKey, "BIM_DOCUMENTO", payloadHash
            );
            if (claim.isPresent()) {
                IdempotenciaConstruccionEntity idemp = claim.get();
                if (idemp.getResultadoJson() != null && !idemp.getResultadoJson().trim().isEmpty()) {
                    try {
                        return objectMapper.readValue(idemp.getResultadoJson(), DocumentoBimEntity.class);
                    } catch (Exception ignored) {}
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
                String json = null;
                try {
                    json = objectMapper.writeValueAsString(guardado);
                } catch (Exception ignored) {}
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
                ? calcularSha256("RFI|" + proyectoId + "|" + numLimpio)
                : null;

        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<IdempotenciaConstruccionEntity> claim = idempotenciaService.reclamarClave(
                    tenantId, idempotencyKey, "RFI_CONSTRUCCION", payloadHash
            );
            if (claim.isPresent()) {
                IdempotenciaConstruccionEntity idemp = claim.get();
                if (idemp.getResultadoJson() != null && !idemp.getResultadoJson().trim().isEmpty()) {
                    try {
                        return objectMapper.readValue(idemp.getResultadoJson(), RfiConstruccionEntity.class);
                    } catch (Exception ignored) {}
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
                String json = null;
                try {
                    json = objectMapper.writeValueAsString(guardado);
                } catch (Exception ignored) {}
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
}
