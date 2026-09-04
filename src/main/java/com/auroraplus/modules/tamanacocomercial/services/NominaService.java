package com.auroraplus.modules.tamanacocomercial.services;

import com.auroraplus.modules.tamanacocomercial.dto.NominaItemDTO;
import com.auroraplus.modules.tamanacocomercial.dto.NominaPagoRequestDTO;
import com.auroraplus.modules.tamanacocomercial.dto.NominaSemanaResponseDTO;
import com.auroraplus.modules.tamanacocomercial.entities.AnalisisLaboratorio;
import com.auroraplus.modules.tamanacocomercial.entities.DespachoComercial;
import com.auroraplus.modules.tamanacocomercial.entities.Gasto;
import com.auroraplus.modules.tamanacocomercial.entities.Mina;
import com.auroraplus.modules.tamanacocomercial.entities.Nomina;
import com.auroraplus.modules.tamanacocomercial.repositories.AnalisisLaboratorioRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.DespachoComercialRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.GastoRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.MinaRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.NominaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service("tamanacoComercialNominaService")
public class NominaService {

    @Autowired
    private DespachoComercialRepository despachoComercialRepository;

    @Autowired
    private MinaRepository minaRepository;

    @Autowired
    private GastoRepository gastoRepository;

    @Autowired
    private AnalisisLaboratorioRepository analisisLaboratorioRepository;

    @Autowired
    private NominaRepository nominaRepository;

    @Autowired
    private AuditoriaService auditoriaService;

    private static final BigDecimal PENALIZACION_DEFAULT = new BigDecimal("10000.00");

    public Map<String, Object> guardarAjusteRapido(Long tenantId, Long id, BigDecimal ajuste, String nota) {
        Nomina nomina = nominaRepository.findById(id).orElse(null);
        if (nomina == null) {
            throw new RuntimeException("No se encontró el registro de nómina ID " + id);
        }
        BigDecimal ajusteFinal = ajuste != null ? ajuste : BigDecimal.ZERO;
        nomina.setAjusteManual(ajusteFinal);
        nomina.setNotaRecordatorio(nota != null ? nota.trim() : "");
        BigDecimal totalBase = nomina.getTotalNetoCarbon() != null ? nomina.getTotalNetoCarbon() : BigDecimal.ZERO;
        BigDecimal totalFinal = totalBase.add(ajusteFinal);
        nomina.setTotalApresupuestar(totalFinal);
        nominaRepository.save(nomina);
        auditoriaService.registrar(tenantId, "EDICION", "NOMINA", "Ajustó nómina de " + nomina.getMina() + ": $" + ajuste + " (Nota: " + nota + ")");
        return Map.of("success", true, "totalFinal", totalFinal, "id", nomina.getId());
    }

    /**
     * Calcula la nómina de despachos por mina para una semana dada.
     */
    public NominaSemanaResponseDTO calcularSemana(Long tenantId, String fecha) {
        LocalDate diaReferencia = (fecha != null && !fecha.isBlank()) ? LocalDate.parse(fecha) : LocalDate.now();
        LocalDate lunes = diaReferencia.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate domingo = lunes.plusDays(6);
        LocalDateTime inicioSemana = lunes.atStartOfDay();
        LocalDateTime finSemana = domingo.atTime(23, 59, 59);

        // 1. Despachos de la semana
        List<DespachoComercial> despachosSemana = despachoComercialRepository.findByFechaDespachoBetween(inicioSemana, finSemana);

        // 2. Agrupar por mina
        Map<String, List<DespachoComercial>> porMina = despachosSemana.stream()
                .collect(Collectors.groupingBy(
                        d -> d.getMina() != null && !d.getMina().trim().isEmpty() ? d.getMina().trim().toUpperCase() : "SIN MINA"
                ));

        // 3. Minas configuradas (para tarifas)
        Map<String, Mina> minasMap = minaRepository.findAll().stream()
                .filter(m -> m.getNombre() != null && !m.getNombre().trim().isEmpty())
                .collect(Collectors.toMap(
                        m -> m.getNombre().trim().toLowerCase(),
                        m -> m,
                        (a, b) -> a
                ));

        // 4. Gastos: préstamos pendientes y pagos de nómina
        List<Gasto> todosGastos = gastoRepository.findAll();

        List<Gasto> todosPrestamosPendientes = todosGastos.stream()
                .filter(g -> "Préstamo".equalsIgnoreCase(g.getCategoria())
                        && !Boolean.TRUE.equals(g.getDescontado())
                        && g.getMinaAsociada() != null
                        && !g.getMinaAsociada().trim().isEmpty())
                .collect(Collectors.toList());

        List<Gasto> todosPagosNomina = todosGastos.stream()
                .filter(g -> ("Nómina Minas".equalsIgnoreCase(g.getCategoria()) || "Pago Nómina".equalsIgnoreCase(g.getCategoria()))
                        && g.getMinaAsociada() != null
                        && !g.getMinaAsociada().trim().isEmpty())
                .collect(Collectors.toList());

        List<NominaItemDTO> items = new ArrayList<>();
        BigDecimal totalGeneralCop = BigDecimal.ZERO;
        BigDecimal totalPrestamosGeneralCop = BigDecimal.ZERO;
        BigDecimal totalPagadoGeneralCop = BigDecimal.ZERO;
        BigDecimal totalPendienteGeneralCop = BigDecimal.ZERO;

        for (Map.Entry<String, List<DespachoComercial>> entry : porMina.entrySet()) {
            String nombreMina = entry.getKey();
            List<DespachoComercial> despachosMina = entry.getValue();

            BigDecimal toneladas = despachosMina.stream()
                    .map(d -> d.getPeso() != null ? d.getPeso() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            Mina mina = minasMap.get(nombreMina.toLowerCase());
            BigDecimal tarifaBase = (mina != null && mina.getTarifaCopPorTon() != null) ? mina.getTarifaCopPorTon() : BigDecimal.ZERO;

            BigDecimal penalizacion = BigDecimal.ZERO;
            boolean tienePenalizacion = false;

            Optional<AnalisisLaboratorio> optAnalisis = analisisLaboratorioRepository
                    .findFirstByMinaIgnoreCaseAndFechaMuestraBetweenOrderByFechaMuestraDesc(nombreMina, lunes, domingo);

            if (optAnalisis.isEmpty()) {
                optAnalisis = analisisLaboratorioRepository
                        .findFirstByMinaIgnoreCaseAndFechaAnalisisBetweenOrderByFechaAnalisisDesc(nombreMina, lunes, domingo);
            }

            if (optAnalisis.isPresent()) {
                AnalisisLaboratorio analisis = optAnalisis.get();
                String estado = (analisis.getEstado() != null ? analisis.getEstado() : analisis.getEstadoPenalizacion());
                boolean esPenalizado = "PENALIZADO".equalsIgnoreCase(estado) || "CRITICO".equalsIgnoreCase(estado) || "RECHAZADO".equalsIgnoreCase(estado);

                if (esPenalizado || (analisis.getCeniza() != null && analisis.getCeniza().compareTo(new BigDecimal("10.0")) > 0)) {
                    penalizacion = (analisis.getDescuentoAplicado() != null && analisis.getDescuentoAplicado().compareTo(BigDecimal.ZERO) > 0)
                            ? analisis.getDescuentoAplicado() : PENALIZACION_DEFAULT;
                    tienePenalizacion = true;
                }
            }

            BigDecimal tarifaFinal = tarifaBase.subtract(penalizacion).max(BigDecimal.ZERO);
            BigDecimal totalCop = toneladas.multiply(tarifaFinal).setScale(2, RoundingMode.HALF_UP);

            List<Gasto> prestamosMina = todosPrestamosPendientes.stream()
                    .filter(p -> p.getMinaAsociada().trim().equalsIgnoreCase(nombreMina))
                    .collect(Collectors.toList());

            List<Map<String, Object>> prestamosDetalle = prestamosMina.stream()
                    .map(p -> {
                        Map<String, Object> pm = new LinkedHashMap<>();
                        pm.put("id", p.getId());
                        pm.put("fecha", p.getFecha());
                        pm.put("descripcion", p.getDescripcion());
                        pm.put("monto", p.getMonto());
                        pm.put("moneda", p.getMoneda());
                        pm.put("metodoPago", p.getMetodoPago());
                        return pm;
                    })
                    .collect(Collectors.toList());

            BigDecimal totalPrestamosMinaCop = prestamosMina.stream()
                    .filter(p -> "COP".equalsIgnoreCase(p.getMoneda()))
                    .map(p -> p.getMonto() != null ? p.getMonto() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal netoPagarCop = totalCop.subtract(totalPrestamosMinaCop).max(BigDecimal.ZERO);

            Nomina nominaSemana = nominaRepository.findByMinaIgnoreCaseAndFechaInicioAndFechaFin(nombreMina, lunes, domingo)
                    .orElseGet(() -> {
                        Nomina n = new Nomina();
                        n.setTenantId(tenantId);
                        n.setMina(nombreMina);
                        n.setFechaInicio(lunes);
                        n.setFechaFin(domingo);
                        n.setAjusteManual(BigDecimal.ZERO);
                        return n;
                    });

            BigDecimal ajusteManual = nominaSemana.getAjusteManual() != null ? nominaSemana.getAjusteManual() : BigDecimal.ZERO;
            BigDecimal totalFinal = netoPagarCop.add(ajusteManual).setScale(2, RoundingMode.HALF_UP);

            nominaSemana.setTotalNetoCarbon(netoPagarCop);
            nominaSemana.setTotalApresupuestar(totalFinal);
            nominaSemana = nominaRepository.save(nominaSemana);

            List<Gasto> pagosMina = todosPagosNomina.stream()
                    .filter(g -> g.getMinaAsociada().trim().equalsIgnoreCase(nombreMina))
                    .filter(g -> (g.getDescripcion() != null && g.getDescripcion().contains(lunes.toString()))
                            || (g.getFecha() != null && !g.getFecha().isBefore(lunes) && !g.getFecha().isAfter(domingo)))
                    .collect(Collectors.toList());

            List<Map<String, Object>> pagosDetalle = pagosMina.stream()
                    .map(p -> {
                        Map<String, Object> pg = new LinkedHashMap<>();
                        pg.put("id", p.getId());
                        pg.put("fecha", p.getFecha());
                        pg.put("descripcion", p.getDescripcion());
                        pg.put("monto", p.getMonto());
                        pg.put("moneda", p.getMoneda());
                        pg.put("metodoPago", p.getMetodoPago());
                        return pg;
                    })
                    .collect(Collectors.toList());

            BigDecimal totalPagadoMinaCop = pagosMina.stream()
                    .filter(p -> "COP".equalsIgnoreCase(p.getMoneda()))
                    .map(p -> p.getMonto() != null ? p.getMonto() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal saldoPendienteMinaCop = totalFinal.subtract(totalPagadoMinaCop).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);

            String estado;
            if (totalCop.compareTo(BigDecimal.ZERO) == 0) {
                estado = "SIN_TARIFA";
            } else if (saldoPendienteMinaCop.compareTo(BigDecimal.ZERO) <= 0 && totalFinal.compareTo(BigDecimal.ZERO) > 0) {
                estado = "PAGADA";
            } else if (totalPagadoMinaCop.compareTo(BigDecimal.ZERO) > 0) {
                estado = "PARCIAL";
            } else {
                estado = "PENDIENTE";
            }

            List<Map<String, Object>> detalle = despachosMina.stream()
                    .sorted(Comparator.comparing(DespachoComercial::getFechaDespacho, Comparator.nullsFirst(Comparator.naturalOrder())))
                    .map(d -> {
                        Map<String, Object> viaje = new LinkedHashMap<>();
                        viaje.put("id", d.getId());
                        viaje.put("fecha", d.getFechaDespacho());
                        viaje.put("chofer", d.getChofer());
                        viaje.put("placa", d.getPlaca());
                        viaje.put("peso", d.getPeso() != null ? d.getPeso().setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO);
                        return viaje;
                    })
                    .collect(Collectors.toList());

            NominaItemDTO item = new NominaItemDTO();
            item.setMina(nombreMina);
            item.setViajes(despachosMina.size());
            item.setToneladas(toneladas.setScale(2, RoundingMode.HALF_UP));
            item.setTarifaBaseCop(tarifaBase);
            item.setPenalizacionCop(penalizacion);
            item.setTienePenalizacion(tienePenalizacion);
            item.setTarifaCop(tarifaFinal);
            item.setTotalCop(totalCop);
            item.setConfigurada(mina != null && tarifaBase.compareTo(BigDecimal.ZERO) > 0);
            item.setMinaId(mina != null ? mina.getId() : null);
            item.setDetalle(detalle);
            item.setPrestamos(prestamosDetalle);
            item.setTienePrestamos(!prestamosDetalle.isEmpty());
            item.setTotalPrestamosCop(totalPrestamosMinaCop);
            item.setNetoPagarCop(netoPagarCop);
            item.setNominaId(nominaSemana.getId());
            item.setAjusteManual(ajusteManual);
            item.setNotaRecordatorio(nominaSemana.getNotaRecordatorio());
            item.setTotalFinalCop(totalFinal);
            item.setPagos(pagosDetalle);
            if (!pagosMina.isEmpty()) {
                Gasto ultimoPago = pagosMina.get(pagosMina.size() - 1);
                item.setUltimoGastoId(ultimoPago.getId());
                item.setReciboUrl(ultimoPago.getReciboUrl());
            }
            item.setTotalPagadoCop(totalPagadoMinaCop);
            item.setSaldoPendienteCop(saldoPendienteMinaCop);
            item.setEstado(estado);

            items.add(item);
            totalGeneralCop = totalGeneralCop.add(totalFinal);
            totalPrestamosGeneralCop = totalPrestamosGeneralCop.add(totalPrestamosMinaCop);
            totalPagadoGeneralCop = totalPagadoGeneralCop.add(totalPagadoMinaCop);
            totalPendienteGeneralCop = totalPendienteGeneralCop.add(saldoPendienteMinaCop);
        }

        items.sort((a, b) -> {
            BigDecimal sa = a.getSaldoPendienteCop() != null ? a.getSaldoPendienteCop() : BigDecimal.ZERO;
            BigDecimal sb = b.getSaldoPendienteCop() != null ? b.getSaldoPendienteCop() : BigDecimal.ZERO;
            return sb.compareTo(sa);
        });

        NominaSemanaResponseDTO respuesta = new NominaSemanaResponseDTO();
        respuesta.setSemanaInicio(lunes.toString());
        respuesta.setSemanaFin(domingo.toString());
        respuesta.setTotalDespachos(despachosSemana.size());
        respuesta.setItems(items);
        respuesta.setTotalGeneralCop(totalGeneralCop.setScale(2, RoundingMode.HALF_UP));
        respuesta.setTotalPrestamosGeneralCop(totalPrestamosGeneralCop.setScale(2, RoundingMode.HALF_UP));
        respuesta.setTotalPagadoGeneralCop(totalPagadoGeneralCop.setScale(2, RoundingMode.HALF_UP));
        respuesta.setTotalPendienteGeneralCop(totalPendienteGeneralCop.setScale(2, RoundingMode.HALF_UP));

        return respuesta;
    }

    /**
     * Registra el pago de nómina para una mina y marca préstamos descontados.
     */
    public Gasto pagarNomina(Long tenantId, NominaPagoRequestDTO request) {
        String mina = request.getMina();
        BigDecimal monto = request.getMonto() != null ? request.getMonto() : BigDecimal.ZERO;
        String moneda = request.getMoneda() != null ? request.getMoneda() : "COP";
        String metodoPago = request.getMetodoPago() != null ? request.getMetodoPago() : "Transferencia Bancaria";
        String fechaStr = request.getFecha();
        LocalDate fecha = (fechaStr != null && !fechaStr.isEmpty()) ? LocalDate.parse(fechaStr) : LocalDate.now();
        String semanaInicio = request.getSemanaInicio() != null ? request.getSemanaInicio() : "";
        String semanaFin = request.getSemanaFin() != null ? request.getSemanaFin() : "";
        String notas = request.getNotas();

        if (mina == null || mina.trim().isEmpty() || monto.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Mina y monto válido son requeridos");
        }

        String desc = "Pago Nómina Semana " + semanaInicio + " al " + semanaFin + " — Mina " + mina +
                (notas != null && !notas.isBlank() ? " (" + notas.trim() + ")" : "");

        Gasto gasto = new Gasto();
        gasto.setTenantId(tenantId);
        gasto.setFecha(fecha);
        gasto.setCategoria("Nómina Minas");
        gasto.setDescripcion(desc);
        gasto.setMonto(monto);
        gasto.setMetodoPago(metodoPago);
        gasto.setMoneda(moneda);
        gasto.setMinaAsociada(mina);
        gasto.setDescontado(false);
        gasto.recalcularMontoUsd();

        Gasto guardado = gastoRepository.save(gasto);

        auditoriaService.registrar(tenantId, "APROBAR", "NOMINA", "Pagó nómina a " + mina + " por " + monto + " " + moneda);

        if (request.getPrestamosIds() != null) {
            for (Long pid : request.getPrestamosIds()) {
                gastoRepository.findById(pid).ifPresent(p -> {
                    p.setDescontado(true);
                    gastoRepository.save(p);
                });
            }
        }

        return guardado;
    }
}
