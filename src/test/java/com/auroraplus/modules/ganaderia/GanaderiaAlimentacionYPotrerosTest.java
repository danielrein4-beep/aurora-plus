package com.auroraplus.modules.ganaderia;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.rrhh.entities.Empleado;
import com.auroraplus.core.rrhh.entities.PagoNomina;
import com.auroraplus.core.rrhh.repositories.EmpleadoRepository;
import com.auroraplus.core.rrhh.services.PagoNominaService;
import com.auroraplus.modules.ganaderia.controllers.RegistroOrdenoController;
import com.auroraplus.modules.ganaderia.entities.*;
import com.auroraplus.modules.ganaderia.repositories.*;
import com.auroraplus.modules.ganaderia.services.GanaderiaAlimentacionService;
import com.auroraplus.modules.ganaderia.services.PotreroRotacionService;
import com.auroraplus.modules.ganaderia.services.GanaderiaSanidadService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Cobertura de negocio de Alimentación (kárdex de insumos) y Rotación de
 * Potreros — segunda tanda de tests de Ganadería, complementa
 * GanaderiaLogicaNegocioTest (que cubrió compra/venta/sanidad).
 */
@SpringBootTest
@ActiveProfiles("test")
class GanaderiaAlimentacionYPotrerosTest {

    @Autowired private GanaderiaAlimentacionService ganaderiaAlimentacionService;
    @Autowired private PotreroRotacionService potreroRotacionService;

    @Autowired private InsumoAlimentacionRepository insumoAlimentacionRepository;
    @Autowired private PotreroRepository potreroRepository;
    @Autowired private AnimalRepository animalRepository;
    @Autowired private MovimientoCajaRepository movimientoCajaRepository;
    @Autowired private RegistroOrdenoController registroOrdenoController;
    @Autowired private GanaderiaSanidadService ganaderiaSanidadService;
    @Autowired private VacunaRepository vacunaRepository;
    @Autowired private EmpleadoRepository empleadoRepository;
    @Autowired private PagoNominaService pagoNominaService;

    @org.junit.jupiter.api.AfterEach
    void limpiarContexto() {
        TenantContext.clear();
        AuthContext.clear();
    }

    private InsumoAlimentacion crearInsumo(Long tenantId, String nombre, BigDecimal stockInicial) {
        InsumoAlimentacion i = new InsumoAlimentacion();
        i.setTenantId(tenantId);
        i.setNombre(nombre);
        i.setTipo("BALANCEADO");
        i.setUnidadMedida("KG");
        i.setStockActual(stockInicial);
        return insumoAlimentacionRepository.save(i);
    }

    private Potrero crearPotrero(Long tenantId, String nombre, String estado, Integer capacidad, Integer diasDescansoMinimo) {
        Potrero p = new Potrero();
        p.setTenantId(tenantId);
        p.setNombre(nombre);
        p.setEstado(estado);
        p.setCapacidadAnimales(capacidad);
        p.setDiasDescansoMinimo(diasDescansoMinimo);
        return potreroRepository.save(p);
    }

    private Animal crearAnimalEnPotrero(Long tenantId, String arete, Potrero potrero) {
        Animal a = new Animal();
        a.setTenantId(tenantId);
        a.setArete(arete);
        a.setEspecie("BOVINO");
        a.setSexo("HEMBRA");
        a.setEstado("ACTIVO");
        a.setPotrero(potrero);
        return animalRepository.save(a);
    }

    // ─────────────────────────────────────────────────────────────────
    // ALIMENTACIÓN: entrada y consumo de insumos
    // ─────────────────────────────────────────────────────────────────

    @Test
    void registrarEntradaSumaStockYCalculaCostoUnitarioYGeneraEgreso() {
        long tenantId = 99001L;
        InsumoAlimentacion insumo = crearInsumo(tenantId, "Maíz molido", BigDecimal.ZERO);

        ganaderiaAlimentacionService.registrarEntrada(tenantId, insumo.getId(), new BigDecimal("100"), new BigDecimal("250.00"), "Compra mensual");

        InsumoAlimentacion releido = insumoAlimentacionRepository.findById(insumo.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("100").compareTo(releido.getStockActual()));
        assertEquals(0, new BigDecimal("2.50").compareTo(releido.getCostoUnitario()), "Costo unitario = 250 / 100 = 2.50");

        BigDecimal egresos = movimientoCajaRepository.sumarMontoPorTipoYMoneda(tenantId, "USD", MovimientoCaja.TipoMovimiento.EGRESO);
        assertEquals(0, new BigDecimal("250.00").compareTo(egresos), "La compra del insumo debe reflejarse como egreso real en caja");
    }

    @Test
    void elCostoDelInsumoEsElPromedioDeLoQueHayEnDeposito() {
        long tenantId = 99027L;
        InsumoAlimentacion insumo = crearInsumo(tenantId, "Sal mineral", BigDecimal.ZERO);
        ganaderiaAlimentacionService.registrarEntrada(tenantId, insumo.getId(), new BigDecimal("10"), new BigDecimal("200.00"), "Compra 1");
        ganaderiaAlimentacionService.registrarEntrada(tenantId, insumo.getId(), new BigDecimal("10"), new BigDecimal("300.00"), "Compra 2");

        InsumoAlimentacion releido = insumoAlimentacionRepository.findById(insumo.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("25.00").compareTo(releido.getCostoUnitario()), "(10 x 20 + 300) / 20 = 25");
    }

    @Test
    void registrarConsumoDescuentaStockYQuedaVinculadoAlPotrero() {
        long tenantId = 99002L;
        InsumoAlimentacion insumo = crearInsumo(tenantId, "Heno", new BigDecimal("50"));
        Potrero potrero = crearPotrero(tenantId, "Potrero 1", "ACTIVO", null, null);

        RegistroConsumo registro = ganaderiaAlimentacionService.registrarConsumo(tenantId, insumo.getId(), potrero.getId(), LocalDate.now(), new BigDecimal("20"));

        assertEquals(0, new BigDecimal("20").compareTo(registro.getCantidad()));
        InsumoAlimentacion releido = insumoAlimentacionRepository.findById(insumo.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("30").compareTo(releido.getStockActual()), "50 - 20 consumidos = 30");
    }

    @Test
    void noSePuedeConsumirMasInsumoDelStockDisponible() {
        long tenantId = 99003L;
        InsumoAlimentacion insumo = crearInsumo(tenantId, "Sal mineral", new BigDecimal("5"));
        Potrero potrero = crearPotrero(tenantId, "Potrero 2", "ACTIVO", null, null);

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> ganaderiaAlimentacionService.registrarConsumo(tenantId, insumo.getId(), potrero.getId(), LocalDate.now(), new BigDecimal("6")));
        assertTrue(ex.getMessage().contains("Stock insuficiente"), "Debe rechazar: " + ex.getMessage());

        InsumoAlimentacion releido = insumoAlimentacionRepository.findById(insumo.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("5").compareTo(releido.getStockActual()), "Un consumo rechazado no debe tocar el stock");
    }

    // ─────────────────────────────────────────────────────────────────
    // ROTACIÓN DE POTREROS
    // ─────────────────────────────────────────────────────────────────

    @Test
    void rotarMueveTodosLosAnimalesActivosYDejaElOrigenEnDescanso() {
        long tenantId = 99004L;
        Potrero origen = crearPotrero(tenantId, "Origen", "ACTIVO", null, null);
        Potrero destino = crearPotrero(tenantId, "Destino", "ACTIVO", null, null);
        crearAnimalEnPotrero(tenantId, "ARETE-ROT-99004-A", origen);
        crearAnimalEnPotrero(tenantId, "ARETE-ROT-99004-B", origen);

        Map<String, Object> resultado = potreroRotacionService.rotar(tenantId, origen.getId(), destino.getId(), null);
        assertEquals(2, resultado.get("animalesMovidos"));

        Potrero origenReleido = potreroRepository.findById(origen.getId()).orElseThrow();
        assertEquals("EN_DESCANSO", origenReleido.getEstado());
        assertNotNull(origenReleido.getFechaInicioDescanso());

        List<Animal> enDestino = animalRepository.findByPotreroIdAndEstado(destino.getId(), "ACTIVO");
        assertEquals(2, enDestino.size(), "Los 2 animales deben quedar en el potrero destino");
    }

    @Test
    void noSePuedeRotarHaciaUnPotreroEnDescansoQueNoCumplioElMinimo() {
        long tenantId = 99005L;
        Potrero origen = crearPotrero(tenantId, "Origen2", "ACTIVO", null, null);
        Potrero destino = crearPotrero(tenantId, "Destino2", "EN_DESCANSO", null, 30); // requiere 30 días
        destino.setFechaInicioDescanso(LocalDate.now().minusDays(5)); // solo lleva 5 días
        potreroRepository.save(destino);
        crearAnimalEnPotrero(tenantId, "ARETE-ROT-99005", origen);

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> potreroRotacionService.rotar(tenantId, origen.getId(), destino.getId(), null));
        assertTrue(ex.getMessage().contains("descanso mínimo"), "Debe rechazar explícitamente: " + ex.getMessage());
    }

    @Test
    void noSePuedeRotarSiSuperaLaCapacidadDelPotreroDestino() {
        long tenantId = 99006L;
        Potrero origen = crearPotrero(tenantId, "Origen3", "ACTIVO", null, null);
        Potrero destino = crearPotrero(tenantId, "Destino3", "ACTIVO", 1, null); // capacidad para solo 1 animal
        crearAnimalEnPotrero(tenantId, "ARETE-CAP-99006-YA", destino); // ya hay 1 en destino
        crearAnimalEnPotrero(tenantId, "ARETE-CAP-99006-A", origen);

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> potreroRotacionService.rotar(tenantId, origen.getId(), destino.getId(), null));
        assertTrue(ex.getMessage().contains("no tiene capacidad"), "Debe rechazar por sobrecupo: " + ex.getMessage());
    }

    @Test
    void reordenarAsignaOrdenSecuencialSegunLaListaRecibida() {
        long tenantId = 99007L;
        Potrero p1 = crearPotrero(tenantId, "P1", "ACTIVO", null, null);
        Potrero p2 = crearPotrero(tenantId, "P2", "ACTIVO", null, null);
        Potrero p3 = crearPotrero(tenantId, "P3", "ACTIVO", null, null);

        List<Potrero> resultado = potreroRotacionService.reordenar(tenantId, List.of(p3.getId(), p1.getId(), p2.getId()));

        assertEquals(1, resultado.get(0).getOrdenRotacion());
        assertEquals(2, resultado.get(1).getOrdenRotacion());
        assertEquals(3, resultado.get(2).getOrdenRotacion());
        assertEquals(p3.getId(), resultado.get(0).getId(), "El primero de la lista recibida debe quedar con orden 1");
    }

    @Test
    void alertasDetectaSobrecargaYDescansoCompleto() {
        long tenantId = 99008L;
        Potrero sobrecargado = crearPotrero(tenantId, "Sobrecargado", "ACTIVO", 1, null);
        crearAnimalEnPotrero(tenantId, "ARETE-ALERTA-99008-A", sobrecargado);
        crearAnimalEnPotrero(tenantId, "ARETE-ALERTA-99008-B", sobrecargado); // 2 animales, capacidad 1

        Potrero descansado = crearPotrero(tenantId, "YaDescanso", "EN_DESCANSO", null, 10);
        descansado.setFechaInicioDescanso(LocalDate.now().minusDays(15)); // ya cumplió los 10 días
        potreroRepository.save(descansado);

        List<Map<String, Object>> alertas = potreroRotacionService.obtenerAlertas(tenantId);

        assertTrue(alertas.stream().anyMatch(a -> "SOBRECARGA".equals(a.get("tipo"))), "Debe alertar sobrecarga: " + alertas);
        assertTrue(alertas.stream().anyMatch(a -> "DESCANSO_COMPLETO".equals(a.get("tipo"))), "Debe alertar descanso completo: " + alertas);
    }

    /** Recorrido de una finca: mover vaca, descansar potrero, sanidad, ordeño y pago de jornal. */
    @Test
    void flujoDeFincaNoContaminaTanqueDuranteRetiroYPagoNominaSaleACaja() {
        long tenantId = 99009L;
        Potrero origen = crearPotrero(tenantId, "Lote Norte", "ACTIVO", 3, 21);
        Potrero destino = crearPotrero(tenantId, "Lote Sur", "ACTIVO", 3, 21);
        Animal vaca = crearAnimalEnPotrero(tenantId, "ARETE-FLUJO-99009", origen);
        vaca.setEstadoProductivo("ORDEÑO");
        animalRepository.save(vaca);

        Map<String, Object> rotacion = potreroRotacionService.rotar(tenantId, origen.getId(), destino.getId(), List.of(vaca.getId()));
        assertEquals(true, rotacion.get("origenEnDescanso"));
        assertEquals("EN_DESCANSO", potreroRepository.findById(origen.getId()).orElseThrow().getEstado());
        assertEquals(destino.getId(), animalRepository.findById(vaca.getId()).orElseThrow().getPotrero().getId());

        Vacuna vacuna = new Vacuna();
        vacuna.setTenantId(tenantId);
        vacuna.setNombre("Mastitis control");
        vacuna.setDiasRetiroLeche(3);
        vacuna.setDiasRetiroCarne(7);
        vacuna = vacunaRepository.save(vacuna);
        ganaderiaSanidadService.aplicarVacuna(tenantId, vaca.getId(), vacuna.getId(), LocalDate.now(), "L-01", "Dra. Pérez", new BigDecimal("8.00"));

        TenantContext.setCurrentTenant(tenantId);
        AuthContext.set("encargado@finca.test", "ENCARGADO_FINCA");
        RegistroOrdenoController.RegistroRequest aTanque = new RegistroOrdenoController.RegistroRequest();
        aTanque.animalId = vaca.getId(); aTanque.fecha = LocalDate.now(); aTanque.turno = "MANANA";
        aTanque.cantidadLitros = new BigDecimal("12.50"); aTanque.destino = "TANQUE";
        assertThrows(IllegalStateException.class, () -> registroOrdenoController.registrar(aTanque),
            "La leche en retiro no puede entrar al tanque comercial");

        RegistroOrdenoController.RegistroRequest descarte = new RegistroOrdenoController.RegistroRequest();
        descarte.animalId = vaca.getId(); descarte.fecha = LocalDate.now(); descarte.turno = "MANANA";
        descarte.cantidadLitros = new BigDecimal("12.50"); descarte.destino = "DESCARTE";
        RegistroOrdeno registrado = registroOrdenoController.registrar(descarte).getBody();
        assertNotNull(registrado);
        assertEquals("DESCARTE", registrado.getDestino());

        Empleado jornalero = new Empleado();
        jornalero.setTenantId(tenantId); jornalero.setNombre("Juan Campo"); jornalero.setCedula("V-99009");
        jornalero.setCargo("Ordeñador"); jornalero.setTipoControl("POR_HORA");
        jornalero.setTarifaPorHora(new BigDecimal("3.00")); jornalero.setMonedaSalario("USD");
        jornalero = empleadoRepository.save(jornalero);
        PagoNomina pago = pagoNominaService.registrarPago(tenantId, jornalero.getId(), LocalDate.now().minusDays(6), LocalDate.now(),
            new BigDecimal("8"), new BigDecimal("24.00"), "USD");
        assertNotNull(pago.getMovimientoCajaId(), "El pago de jornal debe tener su egreso de caja trazable");
    }
}
