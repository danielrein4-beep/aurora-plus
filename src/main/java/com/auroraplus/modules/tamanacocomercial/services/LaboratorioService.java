package com.auroraplus.modules.tamanacocomercial.services;

import com.auroraplus.modules.tamanacocomercial.dto.AnalisisLaboratorioDTO;
import com.auroraplus.modules.tamanacocomercial.entities.AnalisisLaboratorio;
import com.auroraplus.modules.tamanacocomercial.entities.DespachoComercial;
import com.auroraplus.modules.tamanacocomercial.repositories.AnalisisLaboratorioRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.DespachoComercialRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class LaboratorioService {

    @Autowired
    private AnalisisLaboratorioRepository analisisRepository;

    @Autowired
    private AuditoriaService auditoriaService;

    @Autowired
    private DespachoComercialRepository despachoComercialRepository;

    public List<AnalisisLaboratorio> listarTodos() {
        return analisisRepository.findAll();
    }

    public List<AnalisisLaboratorio> listarPorRango(LocalDate inicio, LocalDate fin) {
        return analisisRepository.findByFechaMuestraBetweenOrderByFechaMuestraDesc(inicio, fin);
    }

    public List<AnalisisLaboratorio> listarPorMina(String nombreMina) {
        if (nombreMina == null || nombreMina.trim().isEmpty() || "TODAS".equalsIgnoreCase(nombreMina.trim())) {
            return analisisRepository.findAll();
        }
        return analisisRepository.findByMinaIgnoreCaseOrderByFechaMuestraDesc(nombreMina.trim());
    }

    public AnalisisLaboratorio guardarAnalisis(Long tenantId, AnalisisLaboratorioDTO dto) {
        AnalisisLaboratorio entidad = new AnalisisLaboratorio();
        if (dto.getId() != null) {
            entidad = analisisRepository.findById(dto.getId()).orElse(new AnalisisLaboratorio());
        } else if (dto.getMina() != null && !dto.getMina().isBlank()) {
            LocalDate targetFecha = null;
            if (dto.getFechaAnalisis() != null) {
                targetFecha = dto.getFechaAnalisis();
            } else if (dto.getFechaMuestra() != null && !dto.getFechaMuestra().isBlank()) {
                try {
                    targetFecha = LocalDate.parse(dto.getFechaMuestra().trim());
                } catch (Exception e) {}
            }

            if (targetFecha != null) {
                final LocalDate fComp = targetFecha;
                entidad = analisisRepository.findByMinaIgnoreCaseOrderByFechaMuestraDesc(dto.getMina().trim())
                        .stream()
                        .filter(a -> fComp.equals(a.getFechaMuestra()) || fComp.equals(a.getFechaAnalisis()))
                        .findFirst()
                        .orElse(entidad);
            }
        }

        entidad.setTenantId(tenantId);

        if (dto.getMina() != null) {
            entidad.setMina(dto.getMina().trim());
        }

        if (dto.getFechaAnalisis() != null) {
            entidad.setFechaAnalisis(dto.getFechaAnalisis());
            entidad.setFechaMuestra(dto.getFechaAnalisis());
        } else if (dto.getFechaMuestra() != null && !dto.getFechaMuestra().isBlank()) {
            try {
                LocalDate parsed = LocalDate.parse(dto.getFechaMuestra().trim());
                entidad.setFechaMuestra(parsed);
                entidad.setFechaAnalisis(parsed);
            } catch (Exception e) {
                entidad.setFechaMuestra(LocalDate.now());
                entidad.setFechaAnalisis(LocalDate.now());
            }
        } else if (entidad.getFechaMuestra() == null) {
            entidad.setFechaMuestra(LocalDate.now());
            entidad.setFechaAnalisis(LocalDate.now());
        }

        if (dto.getLoteOReferencia() != null && !dto.getLoteOReferencia().isBlank()) {
            entidad.setLote(dto.getLoteOReferencia().trim());
        } else if (dto.getLote() != null && !dto.getLote().isBlank()) {
            entidad.setLote(dto.getLote().trim());
        } else if (entidad.getLote() == null) {
            entidad.setLote("S/L");
        }

        entidad.setCeniza(dto.getCeniza());
        entidad.setAzufre(dto.getAzufre());
        entidad.setPoderCalorifico(dto.getPoderCalorifico());
        entidad.setHumedad(dto.getHumedad());
        entidad.aplicarReglaPenalizacion();

        AnalisisLaboratorio guardado = analisisRepository.save(entidad);
        auditoriaService.registrar(tenantId, entidad.getId() != null ? "ACTUALIZAR" : "CREAR", "LABORATORIO",
            "Guardó análisis para " + guardado.getMina() + " con Ceniza: " + guardado.getCeniza() + "%");
        return guardado;
    }

    public AnalisisLaboratorio getUltimoAnalisisMina(String nombreMina) {
        return analisisRepository.findTopByMinaOrderByFechaAnalisisDesc(nombreMina).orElse(null);
    }

    public void eliminarAnalisis(Long tenantId, Long id) {
        analisisRepository.findById(id).ifPresent(a -> {
            analisisRepository.delete(a);
            auditoriaService.registrar(tenantId, "ELIMINAR", "LABORATORIO", "Eliminó análisis ID " + id + " de " + a.getMina());
        });
    }

    public Map<String, Object> obtenerCalidadPonderadaSemanal(LocalDate fechaInicio, LocalDate fechaFin) {
        java.time.LocalDateTime inicioDt = fechaInicio.atStartOfDay();
        java.time.LocalDateTime finDt = fechaFin.atTime(23, 59, 59);
        List<DespachoComercial> despachosSemana = despachoComercialRepository.findByFechaDespachoBetween(inicioDt, finDt);

        Map<String, BigDecimal> tonPorMina = despachosSemana.stream()
                .collect(Collectors.groupingBy(
                        d -> d.getMina() != null ? d.getMina().trim().toUpperCase() : "SIN MINA",
                        Collectors.reducing(BigDecimal.ZERO, d -> d.getPeso() != null ? d.getPeso() : BigDecimal.ZERO, BigDecimal::add)
                ));

        BigDecimal granTotalTon = tonPorMina.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Map<String, Object>> detalleMinas = new ArrayList<>();
        BigDecimal sumAsh = BigDecimal.ZERO, sumSulf = BigDecimal.ZERO, sumMoist = BigDecimal.ZERO, sumBtu = BigDecimal.ZERO;
        BigDecimal tonConAnalisis = BigDecimal.ZERO;

        for (Map.Entry<String, BigDecimal> entry : tonPorMina.entrySet()) {
            String mina = entry.getKey();
            BigDecimal ton = entry.getValue();
            BigDecimal participacion = granTotalTon.compareTo(BigDecimal.ZERO) > 0
                ? ton.divide(granTotalTon, 6, RoundingMode.HALF_UP).multiply(new BigDecimal("100"))
                : BigDecimal.ZERO;

            AnalisisLaboratorio lab = analisisRepository.findByMinaIgnoreCaseOrderByFechaMuestraDesc(mina)
                    .stream().findFirst().orElse(null);

            Map<String, Object> fila = new HashMap<>();
            fila.put("mina", mina);
            fila.put("toneladas", ton);
            fila.put("participacion", participacion);

            if (lab != null) {
                BigDecimal ash = lab.getCeniza() != null ? lab.getCeniza() : BigDecimal.ZERO;
                BigDecimal sulf = lab.getAzufre() != null ? lab.getAzufre() : BigDecimal.ZERO;
                BigDecimal moist = lab.getHumedad() != null ? lab.getHumedad() : BigDecimal.ZERO;
                BigDecimal btu = lab.getPoderCalorifico() != null ? lab.getPoderCalorifico() : BigDecimal.ZERO;

                fila.put("idAnalisis", lab.getId());
                fila.put("cenizas", ash);
                fila.put("azufre", sulf);
                fila.put("humedad", moist);
                fila.put("btu", btu);
                fila.put("tieneAnalisis", true);
                fila.put("fechaAnalisis", lab.getFechaMuestra() != null ? lab.getFechaMuestra().toString() : "");

                sumAsh = sumAsh.add(ton.multiply(ash));
                sumSulf = sumSulf.add(ton.multiply(sulf));
                sumMoist = sumMoist.add(ton.multiply(moist));
                sumBtu = sumBtu.add(ton.multiply(btu));
                tonConAnalisis = tonConAnalisis.add(ton);
            } else {
                fila.put("idAnalisis", null);
                fila.put("cenizas", null);
                fila.put("azufre", null);
                fila.put("humedad", null);
                fila.put("btu", null);
                fila.put("tieneAnalisis", false);
                fila.put("fechaAnalisis", null);
            }

            detalleMinas.add(fila);
        }

        detalleMinas.sort((a, b) -> ((BigDecimal) b.get("toneladas")).compareTo((BigDecimal) a.get("toneladas")));

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("totalToneladas", granTotalTon);
        respuesta.put("detalleMinas", detalleMinas);
        boolean hayAnalisis = tonConAnalisis.compareTo(BigDecimal.ZERO) > 0;
        respuesta.put("cenizaPonderada", hayAnalisis ? sumAsh.divide(tonConAnalisis, 4, RoundingMode.HALF_UP) : BigDecimal.ZERO);
        respuesta.put("azufrePonderado", hayAnalisis ? sumSulf.divide(tonConAnalisis, 4, RoundingMode.HALF_UP) : BigDecimal.ZERO);
        respuesta.put("humedadPonderada", hayAnalisis ? sumMoist.divide(tonConAnalisis, 4, RoundingMode.HALF_UP) : BigDecimal.ZERO);
        respuesta.put("btuPonderado", hayAnalisis ? sumBtu.divide(tonConAnalisis, 0, RoundingMode.HALF_UP) : BigDecimal.ZERO);

        return respuesta;
    }
}
