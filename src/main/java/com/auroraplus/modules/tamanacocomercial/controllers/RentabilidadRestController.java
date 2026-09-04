package com.auroraplus.modules.tamanacocomercial.controllers;

import com.auroraplus.modules.tamanacocomercial.entities.DespachoComercial;
import com.auroraplus.modules.tamanacocomercial.entities.Gasto;
import com.auroraplus.modules.tamanacocomercial.entities.Mina;
import com.auroraplus.modules.tamanacocomercial.entities.Nomina;
import com.auroraplus.modules.tamanacocomercial.entities.RentabilidadParametros;
import com.auroraplus.modules.tamanacocomercial.repositories.DespachoComercialRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.GastoRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.MinaRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.NominaRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.RentabilidadParametrosRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Tablero Ejecutivo de Rentabilidad — Estructura de Costos y Margen Neto en USD.
 * Módulo de SOLO CONSULTA: lee Despachos, Mina, Nómina y Gasto para calcular el
 * margen financiero en dólares en un rango de fechas. No modifica ningún registro.
 */
@RestController
@RequestMapping("/api/tamanaco-comercial/rentabilidad")
public class RentabilidadRestController {

    @Autowired
    private DespachoComercialRepository despachoComercialRepository;

    @Autowired
    private NominaRepository nominaRepository;

    @Autowired
    private MinaRepository minaRepository;

    @Autowired
    private GastoRepository gastoRepository;

    @Autowired
    private RentabilidadParametrosRepository rentabilidadParametrosRepository;

    private static final BigDecimal PRECIO_VENTA_USD_DEFAULT = new BigDecimal("45.0");
    private static final BigDecimal TASA_CAMBIO_COP_USD_DEFAULT = new BigDecimal("4000.0");
    private static final BigDecimal TASA_CAMBIO_VES_USD_DEFAULT = new BigDecimal("50.0");

    @GetMapping("/resumen-semanal")
    public Map<String, Object> resumenSemanal(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin,
            @RequestParam(required = false) BigDecimal precioVentaUsd,
            @RequestParam(required = false) BigDecimal tasaCambioCopUsd,
            @RequestParam(required = false) BigDecimal tasaCambioVesUsd) {
        try {
            return calcularResumenSemanal(fechaInicio, fechaFin, precioVentaUsd, tasaCambioCopUsd, tasaCambioVesUsd);
        } catch (Exception e) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("error", "No se pudo calcular el resumen de rentabilidad: " + e.getMessage());
            return error;
        }
    }

    @PostMapping("/parametros-semana")
    public ResponseEntity<?> guardarParametrosSemana(@RequestBody Map<String, Object> body) {
        try {
            LocalDate fechaInicio = LocalDate.parse(body.get("fechaInicio").toString());
            LocalDate fechaFin = LocalDate.parse(body.get("fechaFin").toString());
            BigDecimal precioVentaUsd = body.get("precioVentaUsd") != null ? new BigDecimal(body.get("precioVentaUsd").toString()) : null;
            BigDecimal tasaCambioCopUsd = body.get("tasaCambioCopUsd") != null ? new BigDecimal(body.get("tasaCambioCopUsd").toString()) : null;
            BigDecimal tasaCambioVesUsd = body.get("tasaCambioVesUsd") != null ? new BigDecimal(body.get("tasaCambioVesUsd").toString()) : null;

            RentabilidadParametros parametros = rentabilidadParametrosRepository
                    .findByFechaInicioAndFechaFin(fechaInicio, fechaFin)
                    .orElseGet(RentabilidadParametros::new);
            parametros.setFechaInicio(fechaInicio);
            parametros.setFechaFin(fechaFin);
            parametros.setPrecioVentaUsd(precioVentaUsd);
            parametros.setTasaCambioCopUsd(tasaCambioCopUsd);
            parametros.setTasaCambioVesUsd(tasaCambioVesUsd);

            RentabilidadParametros guardado = rentabilidadParametrosRepository.save(parametros);
            return ResponseEntity.ok(guardado);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "No se pudieron guardar los parámetros de la semana: " + e.getMessage()));
        }
    }

    private Map<String, Object> calcularResumenSemanal(
            LocalDate fechaInicio, LocalDate fechaFin, BigDecimal precioVentaUsdParam, BigDecimal tasaCambioCopUsdParam, BigDecimal tasaCambioVesUsdParam) {

        if (fechaInicio == null || fechaFin == null) {
            LocalDate hoy = LocalDate.now();
            fechaInicio = hoy.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            fechaFin = fechaInicio.plusDays(6);
        }

        if (precioVentaUsdParam == null || tasaCambioCopUsdParam == null || tasaCambioVesUsdParam == null) {
            Optional<RentabilidadParametros> guardados = rentabilidadParametrosRepository.findByFechaInicioAndFechaFin(fechaInicio, fechaFin);
            if (guardados.isPresent()) {
                if (precioVentaUsdParam == null) precioVentaUsdParam = guardados.get().getPrecioVentaUsd();
                if (tasaCambioCopUsdParam == null) tasaCambioCopUsdParam = guardados.get().getTasaCambioCopUsd();
                if (tasaCambioVesUsdParam == null) tasaCambioVesUsdParam = guardados.get().getTasaCambioVesUsd();
            }
        }

        BigDecimal precioVentaUsd = (precioVentaUsdParam != null && precioVentaUsdParam.compareTo(BigDecimal.ZERO) > 0) ? precioVentaUsdParam : PRECIO_VENTA_USD_DEFAULT;
        BigDecimal tasa = (tasaCambioCopUsdParam != null && tasaCambioCopUsdParam.compareTo(BigDecimal.ZERO) > 0) ? tasaCambioCopUsdParam : TASA_CAMBIO_COP_USD_DEFAULT;
        BigDecimal tasaVes = (tasaCambioVesUsdParam != null && tasaCambioVesUsdParam.compareTo(BigDecimal.ZERO) > 0) ? tasaCambioVesUsdParam : TASA_CAMBIO_VES_USD_DEFAULT;

        List<DespachoComercial> despachos = despachoComercialRepository.findByFechaDespachoBetween(
            fechaInicio.atStartOfDay(), fechaFin.atTime(23, 59, 59));

        Map<String, List<DespachoComercial>> porMina = despachos.stream()
                .filter(d -> d.getMina() != null && !d.getMina().isBlank())
                .collect(Collectors.groupingBy(DespachoComercial::getMina));

        List<Map<String, Object>> rankingMinas = new ArrayList<>();

        BigDecimal totalToneladas = BigDecimal.ZERO;
        BigDecimal costoMineralCop = BigDecimal.ZERO;
        BigDecimal costoMineralUsd = BigDecimal.ZERO;

        for (Map.Entry<String, List<DespachoComercial>> entry : porMina.entrySet()) {
            String mina = entry.getKey();
            List<DespachoComercial> despachosMina = entry.getValue();

            int viajes = despachosMina.size();
            BigDecimal toneladasMina = despachosMina.stream()
                    .map(d -> d.getPeso() != null ? d.getPeso() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal ingresoUsdMina = toneladasMina.multiply(precioVentaUsd);

            BigDecimal costoMineralCopMina;
            Optional<Nomina> nominaPeriodo = nominaRepository.findByMinaIgnoreCaseAndFechaInicioAndFechaFin(mina, fechaInicio, fechaFin);
            if (nominaPeriodo.isPresent() && nominaPeriodo.get().getTotalApresupuestar() != null) {
                costoMineralCopMina = nominaPeriodo.get().getTotalApresupuestar();
            } else {
                BigDecimal tarifaMinaCop = minaRepository.findByNombreIgnoreCase(mina)
                        .map(Mina::getTarifaCopPorTon)
                        .orElse(BigDecimal.ZERO);
                costoMineralCopMina = toneladasMina.multiply(tarifaMinaCop);
            }
            BigDecimal costoMineralUsdMina = costoMineralCopMina.divide(tasa, 6, RoundingMode.HALF_UP);

            BigDecimal margenNetoUsdMina = ingresoUsdMina.subtract(costoMineralUsdMina);
            BigDecimal margenPorTonUsdMina = toneladasMina.compareTo(BigDecimal.ZERO) > 0
                ? margenNetoUsdMina.divide(toneladasMina, 6, RoundingMode.HALF_UP) : BigDecimal.ZERO;

            Map<String, Object> fila = new LinkedHashMap<>();
            fila.put("mina", mina);
            fila.put("viajes", viajes);
            fila.put("toneladas", round2(toneladasMina));
            fila.put("ingresoUsd", round2(ingresoUsdMina));
            fila.put("costoMineralUsd", round2(costoMineralUsdMina));
            fila.put("margenNetoUsd", round2(margenNetoUsdMina));
            fila.put("margenPorTonUsd", round2(margenPorTonUsdMina));
            rankingMinas.add(fila);

            totalToneladas = totalToneladas.add(toneladasMina);
            costoMineralCop = costoMineralCop.add(costoMineralCopMina);
            costoMineralUsd = costoMineralUsd.add(costoMineralUsdMina);
        }

        rankingMinas.sort((a, b) -> ((BigDecimal) b.get("margenNetoUsd")).compareTo((BigDecimal) a.get("margenNetoUsd")));

        BigDecimal ingresoBrutoVentaUsd = totalToneladas.multiply(precioVentaUsd);

        List<Gasto> gastos = gastoRepository.findByFechaBetween(fechaInicio, fechaFin);

        BigDecimal costoFletesUsd = BigDecimal.ZERO, costoFletesCop = BigDecimal.ZERO;
        BigDecimal gastosOperativosPatioUsd = BigDecimal.ZERO, gastosOperativosPatioCop = BigDecimal.ZERO;
        BigDecimal gastosAdministrativosUsd = BigDecimal.ZERO, gastosAdministrativosCop = BigDecimal.ZERO;
        Map<String, BigDecimal[]> gastosPorCategoriaAcum = new LinkedHashMap<>();
        List<Map<String, Object>> gastosDetalle = new ArrayList<>();

        for (Gasto g : gastos) {
            if (g.getMonto() == null) continue;

            BigDecimal montoUsd = BigDecimal.ZERO;
            if (g.getMontoUsd() != null && g.getMontoUsd().compareTo(BigDecimal.ZERO) > 0) {
                montoUsd = g.getMontoUsd();
            } else if (g.getMoneda() != null) {
                if ("VES".equalsIgnoreCase(g.getMoneda()) && tasaVes.compareTo(BigDecimal.ZERO) > 0) {
                    montoUsd = g.getMonto().divide(tasaVes, 6, RoundingMode.HALF_UP);
                } else if ("COP".equalsIgnoreCase(g.getMoneda()) && tasa.compareTo(BigDecimal.ZERO) > 0) {
                    montoUsd = g.getMonto().divide(tasa, 6, RoundingMode.HALF_UP);
                } else if ("USD".equalsIgnoreCase(g.getMoneda())) {
                    montoUsd = g.getMonto();
                }
            }

            String tipoGasto = g.getTipoGasto();
            if ("FLETES_TRANSPORTE".equalsIgnoreCase(tipoGasto)) {
                costoFletesUsd = costoFletesUsd.add(montoUsd);
                costoFletesCop = costoFletesCop.add(montoUsd.multiply(tasa));
            } else if ("ADMINISTRATIVO_PERSONAL".equalsIgnoreCase(tipoGasto)) {
                gastosAdministrativosUsd = gastosAdministrativosUsd.add(montoUsd);
                gastosAdministrativosCop = gastosAdministrativosCop.add(montoUsd.multiply(tasa));
            } else {
                gastosOperativosPatioUsd = gastosOperativosPatioUsd.add(montoUsd);
                gastosOperativosPatioCop = gastosOperativosPatioCop.add(montoUsd.multiply(tasa));
            }

            String categoria = (g.getCategoria() != null && !g.getCategoria().isBlank()) ? g.getCategoria() : "Sin Categoría";
            BigDecimal[] acc = gastosPorCategoriaAcum.computeIfAbsent(categoria, k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            acc[0] = acc[0].add(montoUsd);
            acc[1] = acc[1].add(BigDecimal.ONE);

            Map<String, Object> detalle = new LinkedHashMap<>();
            detalle.put("fecha", g.getFecha() != null ? g.getFecha().toString() : null);
            detalle.put("categoria", categoria);
            detalle.put("tipoGasto", g.getTipoGasto());
            detalle.put("descripcion", g.getDescripcion());
            detalle.put("moneda", g.getMoneda());
            detalle.put("monto", round2(g.getMonto()));
            detalle.put("montoUsd", round2(montoUsd));
            gastosDetalle.add(detalle);
        }

        List<Map<String, Object>> gastosPorCategoria = gastosPorCategoriaAcum.entrySet().stream()
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("categoria", e.getKey());
                    m.put("montoUsd", round2(e.getValue()[0]));
                    m.put("cantidadRegistros", e.getValue()[1].intValue());
                    return m;
                })
                .sorted((a, b) -> ((BigDecimal) b.get("montoUsd")).compareTo((BigDecimal) a.get("montoUsd")))
                .collect(Collectors.toList());

        BigDecimal totalCostosDirectosUsd = costoMineralUsd.add(costoFletesUsd).add(gastosOperativosPatioUsd);
        BigDecimal totalCostosDirectosCop = costoMineralCop.add(costoFletesCop).add(gastosOperativosPatioCop);
        BigDecimal totalCostosDirectosUsdPorTon = dividirSeguro(totalCostosDirectosUsd, totalToneladas);

        BigDecimal utilidadBrutaOperativaUsd = ingresoBrutoVentaUsd.subtract(totalCostosDirectosUsd);
        BigDecimal utilidadBrutaOperativaUsdPorTon = dividirSeguro(utilidadBrutaOperativaUsd, totalToneladas);

        BigDecimal totalCostoGlobalUsd = totalCostosDirectosUsd.add(gastosAdministrativosUsd);
        BigDecimal totalCostoGlobalCop = totalCostosDirectosCop.add(gastosAdministrativosCop);
        BigDecimal totalCostoGlobalUsdPorTon = dividirSeguro(totalCostoGlobalUsd, totalToneladas);

        BigDecimal utilidadNetaRealUsd = ingresoBrutoVentaUsd.subtract(totalCostoGlobalUsd);
        BigDecimal margenNetoFinalPorTonUsd = dividirSeguro(utilidadNetaRealUsd, totalToneladas);
        BigDecimal margenNetoFinalPorcentual = ingresoBrutoVentaUsd.compareTo(BigDecimal.ZERO) > 0
            ? utilidadNetaRealUsd.divide(ingresoBrutoVentaUsd, 6, RoundingMode.HALF_UP).multiply(new BigDecimal("100")) : BigDecimal.ZERO;

        BigDecimal costoMineralUsdPorTon = dividirSeguro(costoMineralUsd, totalToneladas);
        BigDecimal costoFletesUsdPorTon = dividirSeguro(costoFletesUsd, totalToneladas);
        BigDecimal gastosOperativosPatioUsdPorTon = dividirSeguro(gastosOperativosPatioUsd, totalToneladas);
        BigDecimal gastosAdministrativosUsdPorTon = dividirSeguro(gastosAdministrativosUsd, totalToneladas);

        List<Map<String, Object>> estructuraCostos = new ArrayList<>();
        estructuraCostos.add(filaEstructura("item", "Carbón en Boca de Mina (Nómina Minas)", costoMineralCop, costoMineralUsd, costoMineralUsdPorTon, totalCostoGlobalUsd));
        estructuraCostos.add(filaEstructura("item", "Fletes y Transporte (Gastos Reales)", costoFletesCop, costoFletesUsd, costoFletesUsdPorTon, totalCostoGlobalUsd));
        estructuraCostos.add(filaEstructura("item", "Operativo de Patio y Diésel (Gastos Reales)", gastosOperativosPatioCop, gastosOperativosPatioUsd, gastosOperativosPatioUsdPorTon, totalCostoGlobalUsd));
        estructuraCostos.add(filaEstructura("subtotal", "SUBTOTAL COSTOS DIRECTOS", totalCostosDirectosCop, totalCostosDirectosUsd, totalCostosDirectosUsdPorTon, totalCostoGlobalUsd));
        estructuraCostos.add(filaEstructura("item", "Gastos Administrativos y Nómina Personal (Gastos Reales)", gastosAdministrativosCop, gastosAdministrativosUsd, gastosAdministrativosUsdPorTon, totalCostoGlobalUsd));
        estructuraCostos.add(filaEstructura("total", "TOTAL COSTO GENERAL", totalCostoGlobalCop, totalCostoGlobalUsd, totalCostoGlobalUsdPorTon, totalCostoGlobalUsd));
        BigDecimal utilidadNetaRealCop = ingresoBrutoVentaUsd.multiply(tasa).subtract(totalCostoGlobalCop);
        estructuraCostos.add(filaEstructura("resultado", "UTILIDAD NETA FINAL", utilidadNetaRealCop, utilidadNetaRealUsd, margenNetoFinalPorTonUsd, totalCostoGlobalUsd));

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("fechaInicio", fechaInicio.toString());
        respuesta.put("fechaFin", fechaFin.toString());
        respuesta.put("precioVentaUsd", precioVentaUsd);
        respuesta.put("tasaCambioCopUsd", tasa);
        respuesta.put("tasaCambioVesUsd", tasaVes);
        respuesta.put("totalToneladas", round2(totalToneladas));
        respuesta.put("ingresoBrutoVentaUsd", round2(ingresoBrutoVentaUsd));
        respuesta.put("costoMineralUsd", round2(costoMineralUsd));
        respuesta.put("costoMineralUsdPorTon", round2(costoMineralUsdPorTon));
        respuesta.put("costoFletesUsd", round2(costoFletesUsd));
        respuesta.put("costoFletesUsdPorTon", round2(costoFletesUsdPorTon));
        respuesta.put("gastosOperativosPatioUsd", round2(gastosOperativosPatioUsd));
        respuesta.put("gastosOperativosPatioUsdPorTon", round2(gastosOperativosPatioUsdPorTon));
        respuesta.put("totalCostosDirectosUsd", round2(totalCostosDirectosUsd));
        respuesta.put("totalCostosDirectosUsdPorTon", round2(totalCostosDirectosUsdPorTon));
        respuesta.put("utilidadBrutaOperativaUsd", round2(utilidadBrutaOperativaUsd));
        respuesta.put("utilidadBrutaOperativaUsdPorTon", round2(utilidadBrutaOperativaUsdPorTon));
        respuesta.put("gastosAdministrativosUsd", round2(gastosAdministrativosUsd));
        respuesta.put("gastosAdministrativosUsdPorTon", round2(gastosAdministrativosUsdPorTon));
        respuesta.put("totalCostoGlobalUsd", round2(totalCostoGlobalUsd));
        respuesta.put("totalCostoGlobalUsdPorTon", round2(totalCostoGlobalUsdPorTon));
        respuesta.put("utilidadNetaRealUsd", round2(utilidadNetaRealUsd));
        respuesta.put("margenNetoFinalPorTonUsd", round2(margenNetoFinalPorTonUsd));
        respuesta.put("margenNetoFinalPorcentual", round2(margenNetoFinalPorcentual));
        respuesta.put("estructuraCostos", estructuraCostos);
        respuesta.put("rankingMinas", rankingMinas);
        respuesta.put("gastosPorCategoria", gastosPorCategoria);
        respuesta.put("gastosDetalle", gastosDetalle);

        return respuesta;
    }

    private BigDecimal dividirSeguro(BigDecimal numerador, BigDecimal denominador) {
        return denominador.compareTo(BigDecimal.ZERO) > 0 ? numerador.divide(denominador, 6, RoundingMode.HALF_UP) : BigDecimal.ZERO;
    }

    private Map<String, Object> filaEstructura(String tipo, String rubro, BigDecimal montoCop, BigDecimal montoUsd, BigDecimal usdPorTon, BigDecimal totalCostoGlobalUsd) {
        BigDecimal pct = totalCostoGlobalUsd.compareTo(BigDecimal.ZERO) > 0
            ? montoUsd.divide(totalCostoGlobalUsd, 6, RoundingMode.HALF_UP).multiply(new BigDecimal("100")) : BigDecimal.ZERO;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("tipo", tipo);
        m.put("rubro", rubro);
        m.put("montoCop", round2(montoCop));
        m.put("montoUsd", round2(montoUsd));
        m.put("usdPorTon", round2(usdPorTon));
        m.put("porcentajeCostoTotal", round2(pct));
        return m;
    }

    private BigDecimal round2(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.HALF_UP);
    }
}
