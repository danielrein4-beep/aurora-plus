package com.auroraplus.modules.ganaderia;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.BajaAnimal;
import com.auroraplus.modules.ganaderia.entities.EventoReproductivo;
import com.auroraplus.modules.ganaderia.entities.RegistroOrdeno;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.BajaAnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.EventoReproductivoRepository;
import com.auroraplus.modules.ganaderia.repositories.RegistroOrdenoRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaIndicadoresService;
import com.auroraplus.modules.ganaderia.services.GanaderiaIndicadoresService.Indicadores;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

/** Indicadores de gestión del hato calculados con datos conocidos. */
@SpringBootTest
@ActiveProfiles("test")
class GanaderiaIndicadoresTest {

    private static final AtomicLong TENANT = new AtomicLong(996_000);
    private static final LocalDate HOY = LocalDate.of(2026, 9, 24);

    @Autowired private GanaderiaIndicadoresService service;
    @Autowired private AnimalRepository animalRepository;
    @Autowired private BajaAnimalRepository bajaAnimalRepository;
    @Autowired private EventoReproductivoRepository eventoRepository;
    @Autowired private RegistroOrdenoRepository ordenoRepository;

    private Animal animal(Long tenant, String arete, String sexo, String tipo, String estadoRepro, Animal madre, LocalDate nacimiento) {
        Animal a = new Animal();
        a.setTenantId(tenant);
        a.setArete(arete);
        a.setSexo(sexo);
        a.setTipoAnimal(tipo);
        a.setEstado("ACTIVO");
        a.setEstadoReproductivo(estadoRepro);
        a.setMadre(madre);
        a.setFechaNacimiento(nacimiento);
        return animalRepository.save(a);
    }

    private void ordeno(Long tenant, Animal vaca, LocalDate fecha, String litros) {
        RegistroOrdeno o = new RegistroOrdeno();
        o.setTenantId(tenant);
        o.setAnimal(vaca);
        o.setFecha(fecha);
        o.setTurno("MANANA");
        o.setCantidadLitros(new BigDecimal(litros));
        ordenoRepository.save(o);
    }

    @Test
    void calculaPrenezNatalidadIntervaloDiasAbiertosMortalidadYLeche() {
        Long t = TENANT.incrementAndGet();
        Animal m1 = animal(t, "M-1", "HEMBRA", "VACA", "PREÑADA", null, null);
        animal(t, "M-2", "HEMBRA", "VACA", "PREÑADA", null, null);
        animal(t, "M-3", "HEMBRA", "VACA", "VACIA", null, null);
        animal(t, "M-4", "HEMBRA", "VACA", "VACIA", null, null);
        animal(t, "N-1", "HEMBRA", "NOVILLA", "VACIA", null, null);
        // M-1 parió el 10/01/2025 y el 05/01/2026 (gemelos: dos crías con un día de diferencia = un parto)
        animal(t, "C-1", "MACHO", "BECERRO", null, m1, LocalDate.of(2025, 1, 10));
        animal(t, "C-2", "HEMBRA", "BECERRA", null, m1, LocalDate.of(2026, 1, 5));
        animal(t, "C-3", "MACHO", "BECERRO", null, m1, LocalDate.of(2026, 1, 6));

        // M-1 preñada de nuevo con parto previsto el 01/11/2026 -> concepción 22/01/2026 (283 días antes)
        EventoReproductivo e = new EventoReproductivo();
        e.setTenantId(t);
        e.setHembra(m1);
        e.setTipo("DIAGNOSTICO_PRENEZ");
        e.setFecha(LocalDate.of(2026, 3, 1));
        e.setFechaProbableParto(LocalDate.of(2026, 11, 1));
        eventoRepository.save(e);

        // Una muerte en el año
        Animal muerto = animal(t, "X-1", "MACHO", "NOVILLO", null, null, null);
        muerto.setEstado("MUERTO");
        animalRepository.save(muerto);
        BajaAnimal b = new BajaAnimal();
        b.setTenantId(t);
        b.setAnimal(muerto);
        b.setFecha(HOY.minusDays(40));
        b.setMotivo("Rayo");
        bajaAnimalRepository.save(b);

        // Leche: M-1 ordeñada dos veces el mismo día (10 + 5) y M-3 un día (12): 27 L en 2 vaca-día
        Animal m3 = animalRepository.findByTenantId(t).stream().filter(a -> a.getArete().equals("M-3")).findFirst().orElseThrow();
        ordeno(t, m1, HOY.minusDays(1), "10");
        ordeno(t, m1, HOY.minusDays(1), "5");
        ordeno(t, m3, HOY.minusDays(2), "12");

        Indicadores r = service.calcular(t, HOY);

        assertEquals(5, r.hembrasReproductivas);
        assertEquals(2, r.prenadas);
        assertEquals(0, new BigDecimal("40.0").compareTo(r.porcentajePrenez));

        assertEquals(4, r.vacas);
        assertEquals(2, r.nacimientos12Meses, "C-2 y C-3 nacieron en los últimos 12 meses");
        assertEquals(0, new BigDecimal("50.0").compareTo(r.natalidad12Meses));

        assertEquals(1, r.intervalosMedidos, "los gemelos son un solo parto");
        assertEquals(360, r.intervaloEntrePartosDias);

        assertEquals(1, r.diasAbiertosMedidos);
        assertEquals(17, r.diasAbiertos, "del 05/01/2026 a la concepción del 22/01/2026");

        assertEquals(1, r.muertes12Meses);
        assertEquals(0, new BigDecimal("11.1").compareTo(r.mortalidad12Meses), "1 de 9 expuestos (8 activos + 1 muerto)");

        assertEquals(0, new BigDecimal("13.5").compareTo(r.litrosPorVacaDia));
        assertEquals(2, r.vacasOrdenadas30Dias);
        assertNull(r.gdpPromedioKgDia, "sin pesajes no se inventa una GDP");
    }

    @Test
    void sinDatosLosIndicadoresQuedanVacios() {
        Indicadores r = service.calcular(TENANT.incrementAndGet(), HOY);
        assertNull(r.porcentajePrenez);
        assertNull(r.natalidad12Meses);
        assertNull(r.intervaloEntrePartosDias);
        assertNull(r.diasAbiertos);
        assertNull(r.mortalidad12Meses);
        assertNull(r.litrosPorVacaDia);
    }
}
