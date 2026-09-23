package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.SociedadCeba;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.DetalleVentaAnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.SociedadCebaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * Ceba en sociedad con reparto de kilos ganados.
 *
 * Por cada animal: kilos ganados = peso actual (o de venta) − peso de entrada.
 * El socio recibe su peso de entrada + (ganados × % socio); la finca, ganados × % finca.
 * Si el animal se vendió, el reparto también se expresa en dinero con el precio
 * por kilo efectivo de su venta (precio de venta ÷ peso al vender).
 */
@Service
public class GanaderiaSociedadCebaService {

    @Autowired
    private SociedadCebaRepository sociedadRepository;

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private DetalleVentaAnimalRepository detalleVentaRepository;

    @Autowired
    private RegistroAuditoriaService auditoriaService;

    public static class DatosSociedad {
        public String nombreSocio;
        public String documentoSocio;
        public String telefonoSocio;
        public BigDecimal porcentajeFinca;
        public LocalDate fechaInicio;
        public String notas;
    }

    public static class LineaLiquidacion {
        public Long animalId;
        public String arete;
        public String nombre;
        public String tipoAnimal;
        public String estado;
        public LocalDate fechaEntrada;
        public Long diasEnFinca;
        public BigDecimal pesoEntrada;
        public BigDecimal pesoActual;
        public BigDecimal kilosGanados;
        public BigDecimal kilosFinca;
        public BigDecimal kilosSocio;
        /** Kilos totales que le corresponden al socio: su peso de entrada + su parte de la ganancia. */
        public BigDecimal kilosTotalesSocio;
        public BigDecimal gdpKgDia;
        // Solo si el animal ya se vendió
        public BigDecimal precioVentaUSD;
        public BigDecimal precioKgUSD;
        public BigDecimal montoFincaUSD;
        public BigDecimal montoSocioUSD;
    }

    public static class ResumenSociedad {
        public SociedadCeba sociedad;
        public BigDecimal porcentajeSocio;
        public int animalesActivos;
        public int animalesVendidos;
        public BigDecimal pesoEntradaTotal = BigDecimal.ZERO;
        public BigDecimal pesoActualTotal = BigDecimal.ZERO;
        public BigDecimal kilosGanadosTotal = BigDecimal.ZERO;
        public BigDecimal kilosFincaTotal = BigDecimal.ZERO;
        public BigDecimal kilosSocioTotal = BigDecimal.ZERO;
        public BigDecimal montoFincaVendidosUSD = BigDecimal.ZERO;
        public BigDecimal montoSocioVendidosUSD = BigDecimal.ZERO;
        public List<LineaLiquidacion> lineas = new ArrayList<>();
    }

    @Transactional(readOnly = true)
    public List<ResumenSociedad> listar(Long tenantId) {
        List<ResumenSociedad> r = new ArrayList<>();
        for (SociedadCeba s : sociedadRepository.findByTenantIdOrderByFechaInicioDesc(tenantId)) {
            r.add(liquidar(tenantId, s));
        }
        return r;
    }

    @Transactional(readOnly = true)
    public ResumenSociedad detalle(Long tenantId, Long sociedadId) {
        return liquidar(tenantId, buscar(tenantId, sociedadId));
    }

    @Transactional
    public SociedadCeba crear(Long tenantId, DatosSociedad d) {
        SociedadCeba s = new SociedadCeba();
        s.setTenantId(tenantId);
        aplicar(s, d, true);
        s.setEstado("ACTIVA");
        SociedadCeba guardada = sociedadRepository.save(s);
        auditoriaService.registrar(tenantId, "GANADERIA", "CREAR", "SociedadCeba", guardada.getId(),
            "Creó la sociedad de ceba con " + guardada.getNombreSocio() + " (" + guardada.getPorcentajeFinca().stripTrailingZeros().toPlainString() + "% finca)");
        return guardada;
    }

    @Transactional
    public SociedadCeba editar(Long tenantId, Long id, DatosSociedad d) {
        SociedadCeba s = buscar(tenantId, id);
        aplicar(s, d, false);
        return sociedadRepository.save(s);
    }

    /** Asigna animales propios y activos a la sociedad, tomando su peso actual como peso de entrada. */
    @Transactional
    public int asignarAnimales(Long tenantId, Long sociedadId, List<Long> animalIds, LocalDate fechaEntrada) {
        SociedadCeba s = buscar(tenantId, sociedadId);
        if (!"ACTIVA".equals(s.getEstado())) throw new IllegalStateException("La sociedad está cerrada");
        if (animalIds == null || animalIds.isEmpty()) throw new IllegalArgumentException("Seleccione al menos un animal");
        LocalDate fecha = fechaEntrada != null ? fechaEntrada : LocalDate.now();
        int n = 0;
        for (Long id : animalIds) {
            Animal a = animalRepository.findForUpdateByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
            if (!"ACTIVO".equals(a.getEstado())) {
                throw new IllegalStateException("El animal " + a.getArete() + " no está activo");
            }
            if (a.getSociedadCebaId() != null && !a.getSociedadCebaId().equals(sociedadId)) {
                throw new IllegalStateException("El animal " + a.getArete() + " ya pertenece a otra sociedad");
            }
            if (a.getPesoActual() == null || a.getPesoActual().signum() <= 0) {
                throw new IllegalStateException("El animal " + a.getArete() + " no tiene peso: péselo antes de ingresarlo a la sociedad");
            }
            if (a.getSociedadCebaId() == null) {
                a.setSociedadCebaId(sociedadId);
                a.setPesoEntradaSociedad(a.getPesoActual());
                a.setFechaEntradaSociedad(fecha);
                animalRepository.save(a);
                n++;
            }
        }
        auditoriaService.registrar(tenantId, "GANADERIA", "EDITAR", "SociedadCeba", sociedadId,
            "Ingresó " + n + " animal(es) a la sociedad con " + s.getNombreSocio());
        return n;
    }

    /** Corrige el peso de entrada (p. ej. se pesó en báscula al recibirlo). */
    @Transactional
    public void corregirPesoEntrada(Long tenantId, Long sociedadId, Long animalId, BigDecimal peso) {
        buscar(tenantId, sociedadId);
        if (peso == null || peso.signum() <= 0) throw new IllegalArgumentException("El peso de entrada debe ser mayor a cero");
        Animal a = animalDeLaSociedad(tenantId, sociedadId, animalId);
        a.setPesoEntradaSociedad(peso);
        animalRepository.save(a);
    }

    /** Saca un animal activo de la sociedad (vuelve a ser propio). Los vendidos quedan para la liquidación. */
    @Transactional
    public void quitarAnimal(Long tenantId, Long sociedadId, Long animalId) {
        buscar(tenantId, sociedadId);
        Animal a = animalDeLaSociedad(tenantId, sociedadId, animalId);
        if (!"ACTIVO".equals(a.getEstado())) {
            throw new IllegalStateException("El animal " + a.getArete() + " ya se vendió o dio de baja: queda en la liquidación");
        }
        a.setSociedadCebaId(null);
        a.setPesoEntradaSociedad(null);
        a.setFechaEntradaSociedad(null);
        animalRepository.save(a);
    }

    @Transactional
    public SociedadCeba cerrar(Long tenantId, Long sociedadId) {
        SociedadCeba s = buscar(tenantId, sociedadId);
        long activos = animalRepository.findByTenantIdAndSociedadCebaId(tenantId, sociedadId).stream()
            .filter(a -> "ACTIVO".equals(a.getEstado())).count();
        if (activos > 0) {
            throw new IllegalStateException("Quedan " + activos + " animal(es) activos en la sociedad: véndalos o sáquelos antes de cerrarla");
        }
        s.setEstado("CERRADA");
        s.setFechaCierre(LocalDate.now());
        auditoriaService.registrar(tenantId, "GANADERIA", "EDITAR", "SociedadCeba", sociedadId,
            "Cerró la sociedad de ceba con " + s.getNombreSocio());
        return sociedadRepository.save(s);
    }

    // ── internos ──

    private ResumenSociedad liquidar(Long tenantId, SociedadCeba s) {
        ResumenSociedad r = new ResumenSociedad();
        r.sociedad = s;
        BigDecimal pctFinca = s.getPorcentajeFinca().divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP);
        r.porcentajeSocio = BigDecimal.valueOf(100).subtract(s.getPorcentajeFinca());
        LocalDate hoy = LocalDate.now();

        for (Animal a : animalRepository.findByTenantIdAndSociedadCebaId(tenantId, s.getId())) {
            LineaLiquidacion l = new LineaLiquidacion();
            l.animalId = a.getId();
            l.arete = a.getArete();
            l.nombre = a.getNombre();
            l.tipoAnimal = a.getTipoAnimal();
            l.estado = a.getEstado();
            l.fechaEntrada = a.getFechaEntradaSociedad();
            l.pesoEntrada = a.getPesoEntradaSociedad();
            l.pesoActual = a.getPesoActual();
            if ("ACTIVO".equals(a.getEstado())) r.animalesActivos++;
            if ("VENDIDO".equals(a.getEstado())) r.animalesVendidos++;

            if (l.pesoEntrada != null && l.pesoActual != null) {
                l.kilosGanados = l.pesoActual.subtract(l.pesoEntrada);
                l.kilosFinca = l.kilosGanados.multiply(pctFinca).setScale(2, RoundingMode.HALF_UP);
                l.kilosSocio = l.kilosGanados.subtract(l.kilosFinca);
                l.kilosTotalesSocio = l.pesoEntrada.add(l.kilosSocio);
                if (l.fechaEntrada != null) {
                    l.diasEnFinca = ChronoUnit.DAYS.between(l.fechaEntrada, hoy);
                    if (l.diasEnFinca > 0) {
                        l.gdpKgDia = l.kilosGanados.divide(BigDecimal.valueOf(l.diasEnFinca), 3, RoundingMode.HALF_UP);
                    }
                }
                r.pesoEntradaTotal = r.pesoEntradaTotal.add(l.pesoEntrada);
                r.pesoActualTotal = r.pesoActualTotal.add(l.pesoActual);
                r.kilosGanadosTotal = r.kilosGanadosTotal.add(l.kilosGanados);
                r.kilosFincaTotal = r.kilosFincaTotal.add(l.kilosFinca);
                r.kilosSocioTotal = r.kilosSocioTotal.add(l.kilosSocio);

                if ("VENDIDO".equals(a.getEstado())) {
                    detalleVentaRepository.findByAnimalId(a.getId())
                        .filter(d -> tenantId.equals(d.getTenantId()) && d.getPrecioVenta() != null)
                        .ifPresent(d -> {
                            l.precioVentaUSD = d.getPrecioVenta();
                            if (l.pesoActual.signum() > 0) {
                                l.precioKgUSD = d.getPrecioVenta().divide(l.pesoActual, 4, RoundingMode.HALF_UP);
                                l.montoFincaUSD = l.kilosFinca.multiply(l.precioKgUSD).setScale(2, RoundingMode.HALF_UP);
                                l.montoSocioUSD = d.getPrecioVenta().subtract(l.montoFincaUSD);
                                r.montoFincaVendidosUSD = r.montoFincaVendidosUSD.add(l.montoFincaUSD);
                                r.montoSocioVendidosUSD = r.montoSocioVendidosUSD.add(l.montoSocioUSD);
                            }
                        });
                }
            }
            r.lineas.add(l);
        }
        r.lineas.sort((x, y) -> x.arete.compareTo(y.arete));
        return r;
    }

    private void aplicar(SociedadCeba s, DatosSociedad d, boolean nueva) {
        if (d == null) throw new IllegalArgumentException("Datos de la sociedad requeridos");
        if (nueva || d.nombreSocio != null) {
            if (d.nombreSocio == null || d.nombreSocio.isBlank()) throw new IllegalArgumentException("Indique el nombre del socio");
            s.setNombreSocio(d.nombreSocio.trim());
        }
        if (nueva || d.porcentajeFinca != null) {
            if (d.porcentajeFinca == null || d.porcentajeFinca.signum() < 0 || d.porcentajeFinca.compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new IllegalArgumentException("El porcentaje de la finca debe estar entre 0 y 100");
            }
            s.setPorcentajeFinca(d.porcentajeFinca);
        }
        if (d.documentoSocio != null) s.setDocumentoSocio(d.documentoSocio.trim());
        if (d.telefonoSocio != null) s.setTelefonoSocio(d.telefonoSocio.trim());
        if (d.notas != null) s.setNotas(d.notas.trim());
        if (d.fechaInicio != null) s.setFechaInicio(d.fechaInicio);
        else if (nueva) s.setFechaInicio(LocalDate.now());
    }

    private SociedadCeba buscar(Long tenantId, Long id) {
        return sociedadRepository.findByIdAndTenantId(id, tenantId)
            .orElseThrow(() -> new RuntimeException("Sociedad no encontrada"));
    }

    private Animal animalDeLaSociedad(Long tenantId, Long sociedadId, Long animalId) {
        Animal a = animalRepository.findForUpdateByIdAndTenantId(animalId, tenantId)
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        if (!sociedadId.equals(a.getSociedadCebaId())) throw new IllegalStateException("El animal no pertenece a esta sociedad");
        return a;
    }
}
