package com.auroraplus.modules.construccion.services;

import com.auroraplus.modules.construccion.entities.*;
import com.auroraplus.modules.construccion.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@Transactional
public class ConstruccionService {

    public static final Set<String> ESTADOS_VALUACION_VALIDOS = Set.of(
            "BORRADOR", "PRESENTADA", "EN_REVISION", "APROBADA", "COBRADA", "RECHAZADA", "ANULADA"
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
    private IdempotenciaConstruccionRepository idempotenciaRepository;

    @Autowired
    private IdempotenciaConstruccionService idempotenciaService;

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
                if (idemp.getRecursoId() != null) {
                    return valuacionRepository.findByTenantIdAndId(tenantId, idemp.getRecursoId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Valuación previa no encontrada"));
                }
            }
        }

        // 2. Validar pertenencia del proyecto y campos de negocio
        proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> {
                    idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant");
                });

        if (valuacion.getEstado() == null || !ESTADOS_VALUACION_VALIDOS.contains(valuacion.getEstado().toUpperCase())) {
            idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado de valuación no válido: " + valuacion.getEstado());
        }

        if (valuacion.getMontoBruto() != null && valuacion.getMontoBruto().compareTo(BigDecimal.ZERO) < 0) {
            idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El monto bruto no puede ser negativo");
        }

        valuacion.setId(null);
        valuacion.setTenantId(tenantId);
        valuacion.setProyectoId(proyectoId);
        valuacion.setEstado(valuacion.getEstado().toUpperCase());

        // 3. Ejecutar efecto de negocio
        ValuacionConstruccionEntity guardada = valuacionRepository.save(valuacion);

        // 4. Completar clave con ID resultante
        idempotenciaService.completarClave(tenantId, idempotencyKey, guardada.getId());

        return guardada;
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
                return insumoRepository.findByTenantIdAndId(tenantId, insumoId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Insumo no encontrado"));
            }
        }

        // 2. Ejecutar descuento atómico (solo si stock_actual >= cantidad)
        int filasAfectadas = insumoRepository.descontarStockAtomico(tenantId, insumoId, cantidad);

        if (filasAfectadas == 0) {
            idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
            InsumoConstruccionEntity insumoExistente = insumoRepository.findByTenantIdAndId(tenantId, insumoId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Insumo no encontrado para este tenant"));

            BigDecimal stockActual = insumoExistente.getStockActual() != null ? insumoExistente.getStockActual() : BigDecimal.ZERO;
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Stock insuficiente: no se permite stock negativo (stock actual: " + stockActual + ", consumo: " + cantidad + ")");
        }

        // 3. Completar clave con ID resultante
        idempotenciaService.completarClave(tenantId, idempotencyKey, insumoId);

        return insumoRepository.findByTenantIdAndId(tenantId, insumoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Insumo no encontrado tras descuento"));
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
                if (idemp.getRecursoId() != null) {
                    return bitacoraRepository.findByTenantIdAndId(tenantId, idemp.getRecursoId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bitácora previa no encontrada"));
                }
            }
        }

        // 2. Validar pertenencia del proyecto y campos
        proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> {
                    idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant");
                });

        if (entrada.getFecha() == null) {
            idempotenciaService.liberarClaveEnFallo(tenantId, idempotencyKey);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La fecha de la bitácora es obligatoria");
        }

        entrada.setId(null);
        entrada.setTenantId(tenantId);
        entrada.setProyectoId(proyectoId);

        // 3. Ejecutar inserción en bitácora
        BitacoraConstruccionEntity guardada = bitacoraRepository.save(entrada);

        // 4. Completar clave con ID resultante
        idempotenciaService.completarClave(tenantId, idempotencyKey, guardada.getId());

        return guardada;
    }

    // --- CATÁLOGO COVENIN (PÚBLICO / COMPARTIDO) ---

    public List<CatalogoCoveninEntity> buscarCatalogo(String busqueda) {
        if (busqueda == null || busqueda.trim().isEmpty()) {
            return catalogoRepository.findAll();
        }
        return catalogoRepository.findByDescripcionContainingIgnoreCaseOrCodigoCoveninContainingIgnoreCase(busqueda, busqueda);
    }
}
