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

    public CapituloConstruccionEntity guardarCapitulo(Long tenantId, CapituloConstruccionEntity capitulo) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
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
            capituloRepository.findByTenantIdAndId(tenantId, partida.getCapituloId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "El capítulo no existe o pertenece a otro tenant"));
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
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        // Validar pertenencia del proyecto
        proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));

        // Validar estado de valuación no arbitrario
        if (valuacion.getEstado() == null || !ESTADOS_VALUACION_VALIDOS.contains(valuacion.getEstado().toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado de valuación no válido: " + valuacion.getEstado());
        }

        // Validar no negatividad de montos
        if (valuacion.getMontoBruto() != null && valuacion.getMontoBruto().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El monto bruto no puede ser negativo");
        }

        // Ignorar IDs en creación
        valuacion.setId(null);
        valuacion.setTenantId(tenantId);
        valuacion.setProyectoId(proyectoId);
        valuacion.setEstado(valuacion.getEstado().toUpperCase());

        return valuacionRepository.save(valuacion);
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
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        if (cantidad == null || cantidad.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad a consumir debe ser estrictamente mayor a cero");
        }

        // Buscar primero por (tenantId, id)
        InsumoConstruccionEntity insumo = insumoRepository.findByTenantIdAndId(tenantId, insumoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Insumo no encontrado para este tenant"));

        BigDecimal stockActual = insumo.getStockActual() != null ? insumo.getStockActual() : BigDecimal.ZERO;
        if (stockActual.compareTo(cantidad) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Stock insuficiente: no se permite stock negativo (stock actual: " + stockActual + ", consumo: " + cantidad + ")");
        }

        insumo.setStockActual(stockActual.subtract(cantidad));
        return insumoRepository.save(insumo);
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
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tenant no autenticado");
        }
        // Validar que el proyecto pertenezca al tenant
        proyectoRepository.findByTenantIdAndId(tenantId, proyectoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado para este tenant"));

        // Validar no negatividad de personal activo
        if (entrada.getPersonalActivo() != null && entrada.getPersonalActivo() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El personal activo no puede ser negativo");
        }

        // Ignorar IDs en creación
        entrada.setId(null);
        entrada.setTenantId(tenantId);
        entrada.setProyectoId(proyectoId);

        return bitacoraRepository.save(entrada);
    }

    // --- CATÁLOGO COVENIN (PÚBLICO / COMPARTIDO) ---

    public List<CatalogoCoveninEntity> buscarCatalogo(String busqueda) {
        if (busqueda == null || busqueda.trim().isEmpty()) {
            return catalogoRepository.findAll();
        }
        return catalogoRepository.findByDescripcionContainingIgnoreCaseOrCodigoCoveninContainingIgnoreCase(busqueda, busqueda);
    }
}
