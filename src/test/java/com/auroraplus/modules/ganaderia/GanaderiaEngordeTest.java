package com.auroraplus.modules.ganaderia;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.RegistroPeso;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.RegistroPesoRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaEngordeService;
import com.auroraplus.modules.ganaderia.services.GanaderiaEngordeService.FilaEngorde;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/** Resumen de engorde (GDP) del hato y corrección de pesajes. */
@SpringBootTest
@ActiveProfiles("test")
class GanaderiaEngordeTest {

    private static final AtomicLong TENANT = new AtomicLong(995_000);

    @Autowired private GanaderiaEngordeService engordeService;
    @Autowired private AnimalRepository animalRepository;
    @Autowired private RegistroPesoRepository registroPesoRepository;

    private Animal animal(Long tenant, String arete, String peso) {
        Animal a = new Animal();
        a.setTenantId(tenant);
        a.setArete(arete);
        a.setSexo("MACHO");
        a.setTipoAnimal("NOVILLO");
        a.setEstado("ACTIVO");
        a.setPesoActual(peso != null ? new BigDecimal(peso) : null);
        return animalRepository.save(a);
    }

    private RegistroPeso pesaje(Long tenant, Animal a, LocalDate fecha, String kg) {
        RegistroPeso r = new RegistroPeso();
        r.setTenantId(tenant);
        r.setAnimal(a);
        r.setFecha(fecha);
        r.setPesoKg(new BigDecimal(kg));
        return registroPesoRepository.save(r);
    }

    @Test
    void resumenCalculaGdpTotalYDelUltimoPeriodo() {
        Long tenant = TENANT.incrementAndGet();
        LocalDate d0 = LocalDate.of(2026, 6, 1);
        Animal n1 = animal(tenant, "N-1", "300");
        pesaje(tenant, n1, d0, "300");
        pesaje(tenant, n1, d0.plusDays(60), "360");   // 1.0 kg/día
        pesaje(tenant, n1, d0.plusDays(90), "366");   // último tramo: 0.2 kg/día (se estancó)
        animal(tenant, "N-2", "250");                // sin pesajes

        Map<String, FilaEngorde> filas = engordeService.resumen(tenant).stream()
            .collect(Collectors.toMap(f -> f.arete, f -> f));

        FilaEngorde f1 = filas.get("N-1");
        assertEquals(3, f1.cantidadPesajes);
        assertEquals(0, new BigDecimal("300").compareTo(f1.pesoInicial));
        assertEquals(0, new BigDecimal("366").compareTo(f1.pesoUltimo));
        assertEquals(90L, f1.dias);
        assertEquals(0, new BigDecimal("0.733").compareTo(f1.gdpKgDia), "66 kg en 90 días");
        assertEquals(0, new BigDecimal("0.200").compareTo(f1.gdpUltimoPeriodoKgDia));

        FilaEngorde f2 = filas.get("N-2");
        assertEquals(0, f2.cantidadPesajes);
        assertNull(f2.gdpKgDia, "sin pesajes no se inventa GDP");
        assertEquals(0, new BigDecimal("250").compareTo(f2.pesoUltimo));
    }

    @Test
    void editarYEliminarPesajeResincronizaElPesoDeLaFicha() {
        Long tenant = TENANT.incrementAndGet();
        LocalDate d0 = LocalDate.of(2026, 7, 1);
        Animal a = animal(tenant, "N-3", "410");
        pesaje(tenant, a, d0, "400");
        RegistroPeso ultimo = pesaje(tenant, a, d0.plusDays(30), "410");

        engordeService.editar(tenant, ultimo.getId(), null, new BigDecimal("430"));
        assertEquals(0, new BigDecimal("430").compareTo(animalRepository.findById(a.getId()).orElseThrow().getPesoActual()));

        engordeService.eliminar(tenant, ultimo.getId());
        assertEquals(0, new BigDecimal("400").compareTo(animalRepository.findById(a.getId()).orElseThrow().getPesoActual()),
            "al borrar el último pesaje, la ficha vuelve al anterior");
    }

    @Test
    void noSePuedeTocarUnPesajeDeOtraFinca() {
        Long fincaA = TENANT.incrementAndGet();
        Long fincaB = TENANT.incrementAndGet();
        RegistroPeso r = pesaje(fincaA, animal(fincaA, "X-1", "300"), LocalDate.of(2026, 7, 1), "300");

        assertThrows(RuntimeException.class, () -> engordeService.editar(fincaB, r.getId(), null, new BigDecimal("1")));
        assertThrows(RuntimeException.class, () -> engordeService.eliminar(fincaB, r.getId()));
        assertTrue(registroPesoRepository.findById(r.getId()).isPresent());
    }

    @Test
    void rechazaPesoCeroYFechaFutura() {
        Long tenant = TENANT.incrementAndGet();
        RegistroPeso r = pesaje(tenant, animal(tenant, "X-2", "300"), LocalDate.of(2026, 7, 1), "300");
        assertThrows(IllegalArgumentException.class, () -> engordeService.editar(tenant, r.getId(), null, BigDecimal.ZERO));
        assertThrows(IllegalArgumentException.class, () -> engordeService.editar(tenant, r.getId(), LocalDate.now().plusDays(3), null));
    }
}
