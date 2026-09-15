package com.auroraplus.modules.horeca.services;

import com.auroraplus.core.financiero.entities.TasaCambio;
import com.auroraplus.core.financiero.repositories.TasaCambioRepository;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.entities.PagoVenta;
import com.auroraplus.modules.horeca.repositories.ComandaRepository;
import com.auroraplus.modules.horeca.repositories.ComandaSpecifications;
import com.auroraplus.modules.horeca.repositories.PagoVentaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Módulo de Reportes Operativos (Fase 1 del plan de escalamiento): motor de
 * consultas dinámicas sobre comandas/tickets, separado del
 * flujo del POS (HorecaService/HorecaController) para que un reporte pesado
 * (un mes completo, filtros cruzados) no compita por locks ni ensucie el
 * código transaccional de venta.
 */
@Service
public class ReporteService {

    @Autowired
    private ComandaRepository comandaRepository;

    @Autowired
    private PagoVentaRepository pagoVentaRepository;

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

        Map<Long, List<PagoVenta>> pagosPorComanda = comandas.isEmpty() ? Map.of() : pagoVentaRepository
            .findByTenantIdAndComandaIdInOrderByFechaPagoAsc(tenantId, comandas.stream().map(Comanda::getId).toList())
            .stream().collect(Collectors.groupingBy(p -> p.getComanda().getId()));

        String monedaBase = motorFinancieroService.obtenerMonedaBase(tenantId);
        Map<LocalDate, Optional<TasaCambio>> tasaVesPorDia = new HashMap<>();
        Map<LocalDate, Optional<TasaCambio>> tasaCopPorDia = new HashMap<>();

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

            dto.totalBase = c.getTotalConsumo();
            dto.monedaBase = c.getMonedaTotal();
            dto.monedaVuelto = c.getMonedaVuelto();
            dto.vuelto = c.getVueltoMonto();

            List<PagoVenta> pagos = pagosPorComanda.getOrDefault(c.getId(), List.of());
            dto.pagos = pagos.stream()
                .map(p -> new ReporteTicketDTO.PagoResumen(p.getMoneda(), p.getMonto(), p.getMetodoPago(),
                    p.getMontoEquivalenteBase(), p.getTasaAplicada())).toList();

            if (!pagos.isEmpty()) {
                if (pagos.size() == 1) {
                    PagoVenta p = pagos.get(0);
                    dto.monedaPago = p.getMoneda();
                    dto.montoOriginal = p.getMonto();
                    if ("COP".equalsIgnoreCase(p.getMoneda())) {
                        dto.totalCop = p.getMonto();
                        dto.totalUsd = p.getMontoEquivalenteBase() != null ? p.getMontoEquivalenteBase() : c.getTotalConsumo();
                    } else if ("VES".equalsIgnoreCase(p.getMoneda()) || "BS".equalsIgnoreCase(p.getMoneda())) {
                        dto.totalBs = p.getMonto();
                        dto.totalUsd = p.getMontoEquivalenteBase() != null ? p.getMontoEquivalenteBase() : c.getTotalConsumo();
                    } else {
                        dto.totalUsd = p.getMonto();
                    }
                } else {
                    dto.monedaPago = "MIXTO";
                    BigDecimal copSum = BigDecimal.ZERO;
                    BigDecimal vesSum = BigDecimal.ZERO;
                    for (PagoVenta p : pagos) {
                        if ("COP".equalsIgnoreCase(p.getMoneda())) {
                            copSum = copSum.add(p.getMonto());
                        } else if ("VES".equalsIgnoreCase(p.getMoneda()) || "BS".equalsIgnoreCase(p.getMoneda())) {
                            vesSum = vesSum.add(p.getMonto());
                        }
                    }
                    if (copSum.compareTo(BigDecimal.ZERO) > 0) dto.totalCop = copSum;
                    if (vesSum.compareTo(BigDecimal.ZERO) > 0) dto.totalBs = vesSum;
                }
            } else {
                dto.monedaPago = "USD";
                dto.montoOriginal = c.getTotalConsumo();
            }

            // Corrección defensiva si un ticket en COP fue grabado con totalUsd en pesos
            if ("COP".equalsIgnoreCase(dto.monedaPago) && dto.totalUsd != null && dto.totalCop != null && dto.totalUsd.compareTo(new BigDecimal("100")) >= 0) {
                Optional<TasaCambio> tasaCop = tasaCopPorDia.computeIfAbsent(dto.fecha != null ? dto.fecha.toLocalDate() : LocalDate.now(), dia ->
                    tasaCambioRepository.findTopByTenantIdAndMonedaOrigenAndMonedaDestinoAndFechaActualizacionLessThanEqualOrderByFechaActualizacionDesc(
                        tenantId, "USD", "COP", dia.atTime(23, 59, 59)));
                BigDecimal divisor = tasaCop.map(TasaCambio::getTasa).filter(t -> t.compareTo(BigDecimal.ZERO) > 0).orElse(new BigDecimal("3100"));
                dto.totalUsd = dto.totalCop.divide(divisor, 2, RoundingMode.HALF_UP);
            }

            if (dto.fecha != null) {
                if (dto.totalBs == null && dto.totalUsd != null) {
                    Optional<TasaCambio> tasaVes = tasaVesPorDia.computeIfAbsent(dto.fecha.toLocalDate(), dia ->
                        tasaCambioRepository.findTopByTenantIdAndMonedaOrigenAndMonedaDestinoAndFechaActualizacionLessThanEqualOrderByFechaActualizacionDesc(
                            tenantId, monedaBase, "VES", dia.atTime(23, 59, 59)));
                    dto.totalBs = tasaVes.map(t -> dto.totalUsd.multiply(t.getTasa())).orElse(null);
                }
                if (dto.totalCop == null && dto.totalUsd != null) {
                    Optional<TasaCambio> tasaCop = tasaCopPorDia.computeIfAbsent(dto.fecha.toLocalDate(), dia ->
                        tasaCambioRepository.findTopByTenantIdAndMonedaOrigenAndMonedaDestinoAndFechaActualizacionLessThanEqualOrderByFechaActualizacionDesc(
                            tenantId, "USD", "COP", dia.atTime(23, 59, 59)));
                    dto.totalCop = tasaCop.map(t -> dto.totalUsd.multiply(t.getTasa()).setScale(0, RoundingMode.HALF_UP)).orElse(null);
                }
            }

            return dto;
        }).toList();
    }
}
