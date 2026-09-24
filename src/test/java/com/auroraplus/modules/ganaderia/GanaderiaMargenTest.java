package com.auroraplus.modules.ganaderia;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.GastoGanaderia;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.GastoGanaderiaRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaAnimalService;
import com.auroraplus.modules.ganaderia.services.MargenGanaderoService;
import com.auroraplus.modules.ganaderia.services.MargenGanaderoService.MargenAnimal;
import com.auroraplus.modules.ganaderia.services.MargenGanaderoService.MargenLote;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Margen por animal y por lote: los gastos de un lote van solo a ese lote, los generales se
 * reparten entre los que estaban en la finca ese día y un animal activo se valoriza por kilo.
 */
@SpringBootTest
@ActiveProfiles("test")
class GanaderiaMargenTest {

    private static final AtomicLong TENANT = new AtomicLong(994_000);

    @Autowired private MargenGanaderoService margenService;
    @Autowired private GanaderiaAnimalService animalService;
    @Autowired private AnimalRepository animalRepository;
    @Autowired private GastoGanaderiaRepository gastoRepository;

    private Animal animal(Long tenant, String arete, String lote, LocalDate nacimiento) {
        Animal a = new Animal();
        a.setTenantId(tenant);
        a.setArete(arete);
        a.setSexo("MACHO");
        a.setTipoAnimal("NOVILLO");
        a.setEstado("ACTIVO");
        a.setLote(lote);
        a.setFechaNacimiento(nacimiento);
        a.setPesoActual(new BigDecimal("300"));
        return animalRepository.save(a);
    }

    private void gasto(Long tenant, String categoria, String monto, LocalDate fecha, String lote) {
        GastoGanaderia g = new GastoGanaderia();
        g.setTenantId(tenant);
        g.setCategoria(categoria);
        g.setDescripcion(categoria);
        g.setMonto(new BigDecimal(monto));
        g.setFecha(fecha);
        g.setLote(lote);
        gastoRepository.save(g);
    }

    private static MargenAnimal de(MargenGanaderoService.Resultado r, Animal a) {
        return r.animales.stream().filter(m -> m.animalId.equals(a.getId())).findFirst().orElseThrow();
    }

    private static void igual(String esperado, BigDecimal real) {
        assertEquals(0, new BigDecimal(esperado).compareTo(real), "esperado " + esperado + " y fue " + real);
    }

    @Test
    void losGastosSeRepartenPorLoteYPorDiasEnLaFinca() {
        Long t = TENANT.incrementAndGet();
        LocalDate hoy = LocalDate.now();
        Animal a1 = animal(t, "M-1", "Ceba", hoy.minusDays(100));
        Animal a2 = animal(t, "M-2", "Ceba", hoy.minusDays(100));
        Animal b1 = animal(t, "M-3", "Cría", hoy.minusDays(5)); // nació después de los gastos

        gasto(t, "ALIMENTACION", "100", hoy.minusDays(10), "Ceba");  // sal mineral del lote Ceba
        gasto(t, "MANTENIMIENTO", "90", hoy.minusDays(10), null);    // cercas: todo el hato de ese día
        gasto(t, "SANIDAD", "30", hoy.minusDays(10), null);          // sin costo por aplicación: se reparte

        var r = margenService.calcular(t, new BigDecimal("2"), "TODOS");
        MargenAnimal m1 = de(r, a1);
        igual("50", m1.alimentacion);
        igual("15", m1.sanidadGeneral);
        igual("45", m1.gastosGenerales);
        igual("110", m1.costoTotal);
        assertEquals("PROYECTADO", m1.tipoIngreso);
        igual("600", m1.ingreso);
        igual("490", m1.margenNeto);
        igual("0", de(r, b1).costoTotal);

        MargenLote ceba = r.lotes.stream().filter(l -> l.lote.equals("Ceba")).findFirst().orElseThrow();
        assertEquals(2, ceba.animales);
        igual("220", ceba.costoTotal);
        igual("980", ceba.margenNeto);
        igual("490", ceba.margenPorAnimal);
        igual("220", r.totales.costoTotal);
    }

    @Test
    void unaMuerteNoDejaIngresoYSuCostoEsPerdida() {
        Long t = TENANT.incrementAndGet();
        LocalDate hoy = LocalDate.now();
        Animal vivo = animal(t, "P-1", null, hoy.minusDays(60));
        Animal muerto = animal(t, "P-2", null, hoy.minusDays(60));
        gasto(t, "OTROS", "40", hoy.minusDays(30), null);
        animalService.registrarBaja(t, muerto.getId(), hoy.minusDays(20), "Rayo", null);
        gasto(t, "OTROS", "40", hoy.minusDays(10), null); // ya no estaba: todo al vivo

        var r = margenService.calcular(t, null, "TODOS");
        MargenAnimal mm = de(r, muerto);
        assertEquals("BAJA", mm.tipoIngreso);
        igual("20", mm.costoTotal);
        igual("-20", mm.margenNeto);
        igual("60", de(r, vivo).costoTotal);
        // Sin ventas ni precio por kilo el vivo queda sin valorar y no entra en el margen.
        assertEquals("SIN_VALORAR", de(r, vivo).tipoIngreso);
        assertNull(de(r, vivo).margenNeto);
        assertEquals(1, r.totales.sinValorar);

        var soloActivos = margenService.calcular(t, null, "ACTIVOS");
        assertEquals(1, soloActivos.animales.size());
    }
}
