package com.auroraplus.modules.ganaderia;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.SociedadCeba;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaSociedadCebaService;
import com.auroraplus.modules.ganaderia.services.GanaderiaSociedadCebaService.DatosSociedad;
import com.auroraplus.modules.ganaderia.services.GanaderiaSociedadCebaService.LineaLiquidacion;
import com.auroraplus.modules.ganaderia.services.GanaderiaSociedadCebaService.ResumenSociedad;
import com.auroraplus.modules.ganaderia.services.GanaderiaVentaService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/** Ceba en sociedad: reparto de kilos ganados, dinero de los vendidos y reglas de la sociedad. */
@SpringBootTest
@ActiveProfiles("test")
class GanaderiaSociedadCebaTest {

    private static final AtomicLong TENANT = new AtomicLong(996_000);

    @Autowired private GanaderiaSociedadCebaService service;
    @Autowired private GanaderiaVentaService ventaService;
    @Autowired private AnimalRepository animalRepository;

    private Animal novillo(Long tenant, String arete, String kg) {
        Animal a = new Animal();
        a.setTenantId(tenant);
        a.setArete(arete);
        a.setSexo("MACHO");
        a.setTipoAnimal("NOVILLO");
        a.setEstado("ACTIVO");
        a.setPesoActual(new BigDecimal(kg));
        return animalRepository.save(a);
    }

    private SociedadCeba sociedad(Long tenant, String pctFinca) {
        DatosSociedad d = new DatosSociedad();
        d.nombreSocio = "Pedro Pérez";
        d.porcentajeFinca = new BigDecimal(pctFinca);
        return service.crear(tenant, d);
    }

    private void pesar(Animal a, String kg) {
        Animal x = animalRepository.findById(a.getId()).orElseThrow();
        x.setPesoActual(new BigDecimal(kg));
        animalRepository.save(x);
    }

    @Test
    void reparteLosKilosGanadosSegunElPorcentaje() {
        Long t = TENANT.incrementAndGet();
        SociedadCeba s = sociedad(t, "60");                 // 60% finca / 40% socio
        Animal a = novillo(t, "S-1", "300");
        service.asignarAnimales(t, s.getId(), List.of(a.getId()), LocalDate.now().minusDays(100));
        pesar(a, "400");                                     // ganó 100 kg

        ResumenSociedad r = service.detalle(t, s.getId());
        LineaLiquidacion l = r.lineas.get(0);
        assertEquals(0, new BigDecimal("100").compareTo(l.kilosGanados));
        assertEquals(0, new BigDecimal("60").compareTo(l.kilosFinca));
        assertEquals(0, new BigDecimal("40").compareTo(l.kilosSocio));
        assertEquals(0, new BigDecimal("340").compareTo(l.kilosTotalesSocio), "300 de entrada + 40 de ganancia");
        assertEquals(0, new BigDecimal("1.000").compareTo(l.gdpKgDia));
        assertEquals(0, new BigDecimal("40").compareTo(r.porcentajeSocio));
        assertEquals(1, r.animalesActivos);
    }

    @Test
    void animalVendidoSeLiquidaEnDineroConElPrecioPorKiloDeLaVenta() {
        Long t = TENANT.incrementAndGet();
        SociedadCeba s = sociedad(t, "50");
        Animal a = novillo(t, "S-2", "300");
        service.asignarAnimales(t, s.getId(), List.of(a.getId()), LocalDate.now().minusDays(120));
        pesar(a, "420");                                     // +120 kg, 60 finca / 60 socio

        GanaderiaVentaService.ItemVentaAnimal item = new GanaderiaVentaService.ItemVentaAnimal();
        item.animalId = a.getId();
        item.precioVenta = new BigDecimal("840");            // 2 USD/kg
        ventaService.registrarVenta(t, "VTA-SOC", "Frigorífico", List.of(item));

        ResumenSociedad r = service.detalle(t, s.getId());
        LineaLiquidacion l = r.lineas.get(0);
        assertEquals("VENDIDO", l.estado);
        assertEquals(0, new BigDecimal("2").compareTo(l.precioKgUSD));
        assertEquals(0, new BigDecimal("120").compareTo(l.montoFincaUSD), "60 kg × 2 USD");
        assertEquals(0, new BigDecimal("720").compareTo(l.montoSocioUSD), "(300 + 60) kg × 2 USD");
        assertEquals(0, new BigDecimal("840").compareTo(l.montoFincaUSD.add(l.montoSocioUSD)), "el reparto suma la venta completa");
        assertEquals(1, r.animalesVendidos);
    }

    @Test
    void reglasDeAsignacionYCierre() {
        Long t = TENANT.incrementAndGet();
        SociedadCeba s1 = sociedad(t, "50");
        SociedadCeba s2 = sociedad(t, "50");
        Animal a = novillo(t, "S-3", "280");
        Animal sinPeso = novillo(t, "S-4", "1");
        Animal x = animalRepository.findById(sinPeso.getId()).orElseThrow();
        x.setPesoActual(null);
        animalRepository.save(x);

        service.asignarAnimales(t, s1.getId(), List.of(a.getId()), null);
        assertThrows(IllegalStateException.class, () -> service.asignarAnimales(t, s2.getId(), List.of(a.getId()), null),
            "un animal no puede estar en dos sociedades");
        assertThrows(IllegalStateException.class, () -> service.asignarAnimales(t, s1.getId(), List.of(sinPeso.getId()), null),
            "sin peso no hay base para calcular los kilos ganados");
        assertThrows(IllegalStateException.class, () -> service.cerrar(t, s1.getId()), "no se cierra con animales activos");

        service.quitarAnimal(t, s1.getId(), a.getId());
        Animal devuelto = animalRepository.findById(a.getId()).orElseThrow();
        assertNull(devuelto.getSociedadCebaId(), "al sacarlo vuelve a ser propio");
        assertEquals("CERRADA", service.cerrar(t, s1.getId()).getEstado());
        assertThrows(IllegalStateException.class, () -> service.asignarAnimales(t, s1.getId(), List.of(a.getId()), null));
    }

    @Test
    void validaPorcentajeYAislamientoPorFinca() {
        Long fincaA = TENANT.incrementAndGet();
        Long fincaB = TENANT.incrementAndGet();
        DatosSociedad mal = new DatosSociedad();
        mal.nombreSocio = "X";
        mal.porcentajeFinca = new BigDecimal("120");
        assertThrows(IllegalArgumentException.class, () -> service.crear(fincaA, mal));

        SociedadCeba s = sociedad(fincaA, "50");
        Animal deB = novillo(fincaB, "B-1", "300");
        assertThrows(RuntimeException.class, () -> service.detalle(fincaB, s.getId()), "otra finca no ve la sociedad");
        assertThrows(RuntimeException.class, () -> service.asignarAnimales(fincaA, s.getId(), List.of(deB.getId()), null),
            "no se pueden asignar animales de otra finca");

        Map<Long, ResumenSociedad> deA = service.listar(fincaA).stream().collect(Collectors.toMap(r -> r.sociedad.getId(), r -> r));
        assertTrue(deA.containsKey(s.getId()));
        assertTrue(service.listar(fincaB).isEmpty());
    }
}
