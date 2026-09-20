package com.auroraplus.modules.construccion.services;

import com.auroraplus.modules.construccion.entities.*;
import com.auroraplus.modules.construccion.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ConstruccionService {

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

    // Proyectos
    public List<ProyectoConstruccionEntity> listarProyectos(Long tenantId) {
        return proyectoRepository.findByTenantIdOrderByIdDesc(tenantId);
    }

    public ProyectoConstruccionEntity guardarProyecto(Long tenantId, ProyectoConstruccionEntity proyecto) {
        proyecto.setTenantId(tenantId);
        return proyectoRepository.save(proyecto);
    }

    public Optional<ProyectoConstruccionEntity> obtenerProyecto(Long tenantId, Long id) {
        return proyectoRepository.findByTenantIdAndId(tenantId, id);
    }

    // Capítulos
    public List<CapituloConstruccionEntity> listarCapitulos(Long tenantId) {
        return capituloRepository.findByTenantIdOrderByOrdenAsc(tenantId);
    }

    public CapituloConstruccionEntity guardarCapitulo(Long tenantId, CapituloConstruccionEntity capitulo) {
        capitulo.setTenantId(tenantId);
        return capituloRepository.save(capitulo);
    }

    // Partidas
    public List<PartidaConstruccionEntity> listarPartidas(Long tenantId, Long proyectoId) {
        return partidaRepository.findByTenantIdAndProyectoIdOrderByCodigoCoveninAsc(tenantId, proyectoId);
    }

    public PartidaConstruccionEntity guardarPartida(Long tenantId, PartidaConstruccionEntity partida) {
        partida.setTenantId(tenantId);
        return partidaRepository.save(partida);
    }

    public void eliminarPartida(Long tenantId, Long partidaId) {
        partidaRepository.findByTenantIdAndId(tenantId, partidaId).ifPresent(partidaRepository::delete);
    }

    // Valuaciones
    public List<ValuacionConstruccionEntity> listarValuaciones(Long tenantId, Long proyectoId) {
        return valuacionRepository.findByTenantIdAndProyectoIdOrderByNumeroValuacionDesc(tenantId, proyectoId);
    }

    public ValuacionConstruccionEntity guardarValuacion(Long tenantId, ValuacionConstruccionEntity valuacion) {
        valuacion.setTenantId(tenantId);
        return valuacionRepository.save(valuacion);
    }

    public Optional<ValuacionConstruccionEntity> actualizarEstadoValuacion(Long tenantId, Long valuacionId, String nuevoEstado) {
        Optional<ValuacionConstruccionEntity> valOpt = valuacionRepository.findByTenantIdAndId(tenantId, valuacionId);
        valOpt.ifPresent(v -> {
            v.setEstado(nuevoEstado);
            valuacionRepository.save(v);
        });
        return valOpt;
    }

    // Insumos
    public List<InsumoConstruccionEntity> listarInsumos(Long tenantId) {
        return insumoRepository.findByTenantIdOrderByCodigoAsc(tenantId);
    }

    public InsumoConstruccionEntity guardarInsumo(Long tenantId, InsumoConstruccionEntity insumo) {
        insumo.setTenantId(tenantId);
        return insumoRepository.save(insumo);
    }

    public InsumoConstruccionEntity registrarConsumoInsumo(Long tenantId, Long insumoId, BigDecimal cantidad) {
        InsumoConstruccionEntity insumo = insumoRepository.findByTenantIdAndId(tenantId, insumoId)
                .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));
        BigDecimal nuevoStock = insumo.getStockActual().subtract(cantidad);
        if (nuevoStock.compareTo(BigDecimal.ZERO) < 0) {
            nuevoStock = BigDecimal.ZERO;
        }
        insumo.setStockActual(nuevoStock);
        return insumoRepository.save(insumo);
    }

    // Bitácora
    public List<BitacoraConstruccionEntity> listarBitacora(Long tenantId, Long proyectoId) {
        return bitacoraRepository.findByTenantIdAndProyectoIdOrderByFechaDesc(tenantId, proyectoId);
    }

    public BitacoraConstruccionEntity agregarEntradaBitacora(Long tenantId, BitacoraConstruccionEntity entrada) {
        entrada.setTenantId(tenantId);
        return bitacoraRepository.save(entrada);
    }

    // Catálogo COVENIN
    public List<CatalogoCoveninEntity> buscarCatalogo(String busqueda) {
        if (busqueda == null || busqueda.trim().isEmpty()) {
            return catalogoRepository.findAll();
        }
        return catalogoRepository.findByDescripcionContainingIgnoreCaseOrCodigoCoveninContainingIgnoreCase(busqueda, busqueda);
    }
}
