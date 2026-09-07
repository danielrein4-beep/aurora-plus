package com.auroraplus.modules.horeca.services;

import com.auroraplus.core.financiero.entities.TasaCambio;
import com.auroraplus.core.financiero.repositories.TasaCambioRepository;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.repositories.ComandaRepository;
import com.auroraplus.modules.horeca.repositories.ComandaSpecifications;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Módulo de Reportes Operativos (Fase 1 del plan de escalamiento): motor de
 * consultas dinámico sobre las comandas/órdenes, separado a propósito del
 * flujo del POS (HorecaService/HorecaController) para que un reporte pesado
 * (rango de fechas amplio, muchos resultados) no comparta código con las
 * operaciones de venta en caliente. Todo de solo lectura.
 */
@Service
public class ReporteService {

    @Autowired
    private ComandaRepository comandaRepository;

    @Autowired
    private TasaCambioRepository tasaCambioRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    /**
     * Búsqueda dinámica de tickets: cada parámetro es opcional — el que
     * venga nulo simplemente no filtra por esa condición (ver
     * ComandaSpecifications). readOnly=true evita el dirty-checking de
     * Hibernate en una consulta que solo lee, y permite que el driver marque
     * la conexión/transacción como de solo lectura a nivel de Postgres.
     */
    @Transactional(readOnly = true)
    public List<ReporteTicketDTO> buscarTickets(Long tenantId, LocalDate fechaInicio, LocalDate fechaFin,
                                                  String metodoPago, Comanda.EstadoComanda estado) {
        LocalDateTime desde = fechaInicio != null ? fechaInicio.atStartOfDay() : null;
        LocalDateTime hasta = fechaFin != null ? fechaFin.atTime(23, 59, 59) : null;

        Specification<Comanda> filtro = Specification
            .where(ComandaSpecifications.deTenant(tenantId))
            .and(ComandaSpecifications.conEstado(estado))
            .and(ComandaSpecifications.conMetodoPago(metodoPago))
            .and(ComandaSpecifications.conFechaCierreEntre(desde, hasta));

        List<Comanda> comandas = comandaRepository.findAll(filtro, Sort.by(Sort.Direction.DESC, "fechaCierre"));

        String monedaBase = motorFinancieroService.obtenerMonedaBase(tenantId);
        // Cache de tasas ya resueltas en esta corrida — evita repetir la
        // misma consulta de tasa histórica para tickets del mismo día.
        Map<LocalDate, Optional<TasaCambio>> tasaPorDia = new HashMap<>();

        return comandas.stream().map(c -> {
            ReporteTicketDTO dto = new ReporteTicketDTO();
            dto.comandaId = c.getId();
            dto.numeroTicket = "COM-" + c.getId();
            dto.fecha = c.getFechaCierre() != null ? c.getFechaCierre() : c.getFechaApertura();
            dto.totalUsd = c.getTotalConsumo();
            dto.metodoPago = c.getMetodoPago();
            dto.estado = c.getEstado().name();
            dto.canal = c.getCanal();
            dto.numeroMesa = c.getNumeroMesa();

            if (dto.fecha != null) {
                Optional<TasaCambio> tasa = tasaPorDia.computeIfAbsent(dto.fecha.toLocalDate(), dia ->
                    tasaCambioRepository.findTopByTenantIdAndMonedaOrigenAndMonedaDestinoAndFechaActualizacionLessThanEqualOrderByFechaActualizacionDesc(
                        tenantId, monedaBase, "VES", dia.atTime(23, 59, 59)));
                dto.totalBs = tasa.map(t -> c.getTotalConsumo().multiply(t.getTasa())).orElse(null);
            }

            return dto;
        }).toList();
    }
}
