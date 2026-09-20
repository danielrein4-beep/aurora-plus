package com.auroraplus.modules.construccion;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.construccion.controllers.ConstruccionController;
import com.auroraplus.modules.construccion.entities.*;
import com.auroraplus.modules.construccion.repositories.*;
import com.auroraplus.modules.construccion.services.IdempotenciaConstruccionService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.ConcurrentLinkedQueue;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class ConstruccionAislamientoTenantP0Test {

    @Autowired
    private ConstruccionController construccionController;

    @Autowired
    private TestIdempotenciaPreClaimObserver testPreClaimObserver;

    @Autowired
    private ProyectoConstruccionRepository proyectoRepository;

    @Autowired
    private CapituloConstruccionRepository capituloRepository;

    @Autowired
    private PartidaConstruccionRepository partidaRepository;

    @Autowired
    private ValuacionConstruccionRepository valuacionRepository;

    @Autowired
    private InsumoConstruccionRepository insumoRepository;

    @Autowired
    private BitacoraConstruccionRepository bitacoraRepository;

    @AfterEach
    void limpiarContexto() {
        TenantContext.clear();
        AuthContext.clear();
    }

    private ProyectoConstruccionEntity crearProyectoHelper(Long tenantId, String codigo, String nombre) {
        ProyectoConstruccionEntity p = new ProyectoConstruccionEntity();
        p.setTenantId(tenantId);
        p.setCodigo(codigo);
        p.setNombre(nombre);
        p.setCliente("Cliente Test S.A.");
        p.setEstado("EN_EJECUCION");
        p.setMontoPresupuestoTotal(new BigDecimal("50000.00"));
        return proyectoRepository.save(p);
    }

    private InsumoConstruccionEntity crearInsumoHelper(Long tenantId, String codigo, String nombre, BigDecimal stock) {
        InsumoConstruccionEntity ins = new InsumoConstruccionEntity();
        ins.setTenantId(tenantId);
        ins.setCodigo(codigo);
        ins.setNombre(nombre);
        ins.setTipo("MATERIAL");
        ins.setUnidad("saco");
        ins.setCostoUnitario(new BigDecimal("10.00"));
        ins.setStockActual(stock);
        ins.setStockMinimo(new BigDecimal("5.00"));
        return insumoRepository.save(ins);
    }

    // 1. Sin TenantContext devuelve 401 Unauthorized en todas las operaciones
    @Test
    void sinTenantContext_devuelve401EnTodasLasOperaciones() {
        TenantContext.clear();

        ResponseStatusException exListarProy = assertThrows(ResponseStatusException.class, () -> construccionController.listarProyectos());
        assertEquals(HttpStatus.UNAUTHORIZED, exListarProy.getStatusCode());

        ResponseStatusException exCrearProy = assertThrows(ResponseStatusException.class, () -> construccionController.crearProyecto(new ProyectoConstruccionEntity()));
        assertEquals(HttpStatus.UNAUTHORIZED, exCrearProy.getStatusCode());

        ResponseStatusException exObtenerProy = assertThrows(ResponseStatusException.class, () -> construccionController.obtenerProyecto(1L));
        assertEquals(HttpStatus.UNAUTHORIZED, exObtenerProy.getStatusCode());

        ResponseStatusException exListarCap = assertThrows(ResponseStatusException.class, () -> construccionController.listarCapitulos());
        assertEquals(HttpStatus.UNAUTHORIZED, exListarCap.getStatusCode());

        ResponseStatusException exCrearCap = assertThrows(ResponseStatusException.class, () -> construccionController.crearCapitulo(new CapituloConstruccionEntity()));
        assertEquals(HttpStatus.UNAUTHORIZED, exCrearCap.getStatusCode());

        ResponseStatusException exListarPart = assertThrows(ResponseStatusException.class, () -> construccionController.listarPartidas(1L));
        assertEquals(HttpStatus.UNAUTHORIZED, exListarPart.getStatusCode());

        ResponseStatusException exCrearPart = assertThrows(ResponseStatusException.class, () -> construccionController.crearPartida(1L, new PartidaConstruccionEntity()));
        assertEquals(HttpStatus.UNAUTHORIZED, exCrearPart.getStatusCode());

        ResponseStatusException exEliminarPart = assertThrows(ResponseStatusException.class, () -> construccionController.eliminarPartida(1L));
        assertEquals(HttpStatus.UNAUTHORIZED, exEliminarPart.getStatusCode());

        ResponseStatusException exListarVal = assertThrows(ResponseStatusException.class, () -> construccionController.listarValuaciones(1L));
        assertEquals(HttpStatus.UNAUTHORIZED, exListarVal.getStatusCode());

        ResponseStatusException exCrearVal = assertThrows(ResponseStatusException.class, () -> construccionController.crearValuacion(1L, new ValuacionConstruccionEntity()));
        assertEquals(HttpStatus.UNAUTHORIZED, exCrearVal.getStatusCode());

        ResponseStatusException exPatchVal = assertThrows(ResponseStatusException.class, () -> construccionController.cambiarEstadoValuacion(1L, Map.of("estado", "APROBADA")));
        assertEquals(HttpStatus.UNAUTHORIZED, exPatchVal.getStatusCode());

        ResponseStatusException exListarIns = assertThrows(ResponseStatusException.class, () -> construccionController.listarInsumos());
        assertEquals(HttpStatus.UNAUTHORIZED, exListarIns.getStatusCode());

        ResponseStatusException exCrearIns = assertThrows(ResponseStatusException.class, () -> construccionController.crearInsumo(new InsumoConstruccionEntity()));
        assertEquals(HttpStatus.UNAUTHORIZED, exCrearIns.getStatusCode());

        ResponseStatusException exConsumo = assertThrows(ResponseStatusException.class, () -> construccionController.registrarConsumo(1L, Map.of("cantidad", BigDecimal.ONE)));
        assertEquals(HttpStatus.UNAUTHORIZED, exConsumo.getStatusCode());

        ResponseStatusException exListarBit = assertThrows(ResponseStatusException.class, () -> construccionController.listarBitacora(1L));
        assertEquals(HttpStatus.UNAUTHORIZED, exListarBit.getStatusCode());

        ResponseStatusException exAgregarBit = assertThrows(ResponseStatusException.class, () -> construccionController.agregarBitacora(1L, new BitacoraConstruccionEntity()));
        assertEquals(HttpStatus.UNAUTHORIZED, exAgregarBit.getStatusCode());
    }

    // 2. Tenant B no puede listar, leer, crear, editar ni borrar datos de Tenant A
    @Test
    void tenantB_noPuedeListarLeerCrearEditarNiBorrarDatosDeTenantA() {
        long tenantA = 88101L;
        long tenantB = 88102L;

        // Tenant A configura su ecosistema de obras
        TenantContext.setCurrentTenant(tenantA);
        ProyectoConstruccionEntity proyA = crearProyectoHelper(tenantA, "PROY-A-ISO", "Torre Financiera A");

        CapituloConstruccionEntity cA = new CapituloConstruccionEntity();
        cA.setTenantId(tenantA);
        cA.setProyectoId(proyA.getId());
        cA.setCodigo("1.0");
        cA.setNombre("Obras Preliminares A");
        cA.setOrden(1);
        CapituloConstruccionEntity capA = capituloRepository.save(cA);

        PartidaConstruccionEntity pA = new PartidaConstruccionEntity();
        pA.setTenantId(tenantA);
        pA.setProyectoId(proyA.getId());
        pA.setCapituloId(capA.getId());
        pA.setCodigoCovenin("E-311.100");
        pA.setDescripcion("Concreto f'c=250 kg/cm2");
        pA.setUnidad("m3");
        pA.setCantidadPresupuestada(new BigDecimal("25.00"));
        pA.setPrecioUnitario(new BigDecimal("110.00"));
        PartidaConstruccionEntity partidaA = partidaRepository.save(pA);

        ValuacionConstruccionEntity vA = new ValuacionConstruccionEntity();
        vA.setTenantId(tenantA);
        vA.setProyectoId(proyA.getId());
        vA.setNumeroValuacion(1);
        vA.setPeriodoDesde(LocalDate.now());
        vA.setPeriodoHasta(LocalDate.now().plusDays(15));
        vA.setFechaEmision(LocalDate.now().plusDays(15));
        vA.setMontoBruto(new BigDecimal("2750.00"));
        vA.setEstado("BORRADOR");
        ValuacionConstruccionEntity valA = valuacionRepository.save(vA);

        InsumoConstruccionEntity insA = crearInsumoHelper(tenantA, "INS-A-01", "Cemento Blanco", new BigDecimal("50.00"));

        BitacoraConstruccionEntity bA = new BitacoraConstruccionEntity();
        bA.setTenantId(tenantA);
        bA.setProyectoId(proyA.getId());
        bA.setFecha(LocalDate.now());
        bA.setClima("DESPEJADO");
        bA.setPersonalActivo(10);
        bA.setActividadesEjecutadas("Vaciado inicial");
        BitacoraConstruccionEntity bitA = bitacoraRepository.save(bA);

        final Long proyAId = proyA.getId();
        final Long capAId = capA.getId();
        final Long partidaAId = partidaA.getId();
        final Long valAId = valA.getId();
        final Long insAId = insA.getId();
        final Long bitAId = bitA.getId();

        // Ahora nos posicionamos como Tenant B
        TenantContext.setCurrentTenant(tenantB);

        // 1. LISTAR: Tenant B no ve ningún recurso de Tenant A
        List<ProyectoConstruccionEntity> proyectosB = construccionController.listarProyectos();
        assertFalse(proyectosB.stream().anyMatch(p -> p.getId().equals(proyAId)), "Tenant B no debe ver proyectos de Tenant A");

        List<InsumoConstruccionEntity> insumosB = construccionController.listarInsumos();
        assertFalse(insumosB.stream().anyMatch(i -> i.getId().equals(insAId)), "Tenant B no debe ver insumos de Tenant A");

        List<CapituloConstruccionEntity> capitulosB = construccionController.listarCapitulos();
        assertFalse(capitulosB.stream().anyMatch(c -> c.getId().equals(capAId)), "Tenant B no debe ver capítulos de Tenant A");

        // Intentar listar subrecursos del proyecto de A -> 404 NOT_FOUND
        ResponseStatusException exListPart = assertThrows(ResponseStatusException.class, () -> construccionController.listarPartidas(proyAId));
        assertEquals(HttpStatus.NOT_FOUND, exListPart.getStatusCode());

        ResponseStatusException exListVal = assertThrows(ResponseStatusException.class, () -> construccionController.listarValuaciones(proyAId));
        assertEquals(HttpStatus.NOT_FOUND, exListVal.getStatusCode());

        ResponseStatusException exListBit = assertThrows(ResponseStatusException.class, () -> construccionController.listarBitacora(proyAId));
        assertEquals(HttpStatus.NOT_FOUND, exListBit.getStatusCode());

        // 2. LEER: Tenant B no puede leer directamente el proyecto de Tenant A
        ResponseEntity<ProyectoConstruccionEntity> respLectura = construccionController.obtenerProyecto(proyAId);
        assertEquals(HttpStatus.NOT_FOUND, respLectura.getStatusCode());

        // 3. CREAR: Tenant B no puede crear partidas, valuaciones ni bitácoras en el proyecto de Tenant A
        PartidaConstruccionEntity nuevaPartida = new PartidaConstruccionEntity();
        nuevaPartida.setCodigoCovenin("E-999.999");
        nuevaPartida.setDescripcion("Inyección ilícita");
        nuevaPartida.setUnidad("m");
        nuevaPartida.setCantidadPresupuestada(BigDecimal.TEN);
        nuevaPartida.setPrecioUnitario(BigDecimal.TEN);
        ResponseStatusException exCrearPart = assertThrows(ResponseStatusException.class, () -> construccionController.crearPartida(proyAId, nuevaPartida));
        assertEquals(HttpStatus.NOT_FOUND, exCrearPart.getStatusCode());

        ValuacionConstruccionEntity nuevaVal = new ValuacionConstruccionEntity();
        nuevaVal.setNumeroValuacion(2);
        nuevaVal.setPeriodoDesde(LocalDate.now());
        nuevaVal.setPeriodoHasta(LocalDate.now().plusDays(10));
        nuevaVal.setFechaEmision(LocalDate.now().plusDays(10));
        nuevaVal.setMontoBruto(BigDecimal.TEN);
        nuevaVal.setEstado("BORRADOR");
        ResponseStatusException exCrearVal = assertThrows(ResponseStatusException.class, () -> construccionController.crearValuacion(proyAId, nuevaVal));
        assertEquals(HttpStatus.NOT_FOUND, exCrearVal.getStatusCode());

        BitacoraConstruccionEntity nuevaBit = new BitacoraConstruccionEntity();
        nuevaBit.setFecha(LocalDate.now());
        nuevaBit.setClima("LLUVIA");
        nuevaBit.setPersonalActivo(5);
        nuevaBit.setActividadesEjecutadas("Hack intento");
        ResponseStatusException exCrearBit = assertThrows(ResponseStatusException.class, () -> construccionController.agregarBitacora(proyAId, nuevaBit));
        assertEquals(HttpStatus.NOT_FOUND, exCrearBit.getStatusCode());

        // 4. EDITAR: Tenant B no puede cambiar estado de valuación ni descontar insumo de Tenant A
        ResponseStatusException exEditarVal = assertThrows(ResponseStatusException.class, () -> construccionController.cambiarEstadoValuacion(valAId, Map.of("estado", "APROBADA")));
        assertEquals(HttpStatus.NOT_FOUND, exEditarVal.getStatusCode());

        ResponseStatusException exEditarIns = assertThrows(ResponseStatusException.class, () -> construccionController.registrarConsumo(insAId, Map.of("cantidad", BigDecimal.ONE)));
        assertEquals(HttpStatus.NOT_FOUND, exEditarIns.getStatusCode());

        // 5. BORRAR: Tenant B no puede eliminar partida de Tenant A
        ResponseStatusException exBorrarPart = assertThrows(ResponseStatusException.class, () -> construccionController.eliminarPartida(partidaAId));
        assertEquals(HttpStatus.NOT_FOUND, exBorrarPart.getStatusCode());

        // Verificar que los datos de Tenant A permanecen 100% íntegros
        TenantContext.setCurrentTenant(tenantA);
        assertTrue(proyectoRepository.findById(proyA.getId()).isPresent());
        assertTrue(partidaRepository.findById(partidaA.getId()).isPresent());
        assertEquals("BORRADOR", valuacionRepository.findById(valA.getId()).orElseThrow().getEstado());
        assertEquals(new BigDecimal("50.00"), insumoRepository.findById(insA.getId()).orElseThrow().getStockActual());
    }

    // 3. No se puede asociar capítulo de un proyecto a otro proyecto, aunque sean del mismo tenant (capitulo.proyectoId == proyectoId)
    @Test
    void referenciasCruzadas_noSePuedeAsociarCapituloDeOtroProyectoDelMismoTenant() {
        long tenant = 99303L;
        TenantContext.setCurrentTenant(tenant);

        // Proyecto 1 y su capítulo C1
        ProyectoConstruccionEntity proy1 = crearProyectoHelper(tenant, "PROY-01", "Edificio Alfa");
        CapituloConstruccionEntity capProy1Entity = new CapituloConstruccionEntity();
        capProy1Entity.setTenantId(tenant);
        capProy1Entity.setProyectoId(proy1.getId());
        capProy1Entity.setCodigo("1.0");
        capProy1Entity.setNombre("Preliminares Edificio Alfa");
        capProy1Entity.setOrden(1);
        CapituloConstruccionEntity capProy1 = capituloRepository.save(capProy1Entity);

        // Proyecto 2 del MISMO tenant
        ProyectoConstruccionEntity proy2 = crearProyectoHelper(tenant, "PROY-02", "Edificio Beta");

        // Intentar crear partida en Proyecto 2 vinculada al capítulo de Proyecto 1 -> BAD_REQUEST (400)
        PartidaConstruccionEntity partidaCruzada = new PartidaConstruccionEntity();
        partidaCruzada.setCapituloId(capProy1.getId());
        partidaCruzada.setCodigoCovenin("E-200.100");
        partidaCruzada.setDescripcion("Replanteo");
        partidaCruzada.setUnidad("m2");
        partidaCruzada.setCantidadPresupuestada(new BigDecimal("100.00"));
        partidaCruzada.setPrecioUnitario(new BigDecimal("5.00"));

        ResponseStatusException exCruzado = assertThrows(ResponseStatusException.class, () -> {
            construccionController.crearPartida(proy2.getId(), partidaCruzada);
        });
        assertEquals(HttpStatus.BAD_REQUEST, exCruzado.getStatusCode());
        assertTrue(exCruzado.getReason().contains("no coincide con el proyecto de la partida"),
                "Debe rechazar vincular un capítulo cuyo proyectoId no sea igual al proyecto de la partida");

        // En su propio Proyecto 1 sí se acepta correctamente
        PartidaConstruccionEntity partidaValida = new PartidaConstruccionEntity();
        partidaValida.setCapituloId(capProy1.getId());
        partidaValida.setCodigoCovenin("E-200.100");
        partidaValida.setDescripcion("Replanteo Válido");
        partidaValida.setUnidad("m2");
        partidaValida.setCantidadPresupuestada(new BigDecimal("100.00"));
        partidaValida.setPrecioUnitario(new BigDecimal("5.00"));

        ResponseEntity<PartidaConstruccionEntity> resp = construccionController.crearPartida(proy1.getId(), partidaValida);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertEquals(capProy1.getId(), resp.getBody().getCapituloId());
    }

    // 4. Tampoco se puede usar un capítulo de otro Tenant
    @Test
    void referenciasCruzadas_partidaNoPuedeUsarCapituloDeOtroTenant() {
        long tenantA = 99301L;
        long tenantB = 99302L;

        CapituloConstruccionEntity capAEntity = new CapituloConstruccionEntity();
        capAEntity.setTenantId(tenantA);
        capAEntity.setCodigo("1.0");
        capAEntity.setNombre("Obras Preliminares A");
        capAEntity.setOrden(1);
        CapituloConstruccionEntity capA = capituloRepository.save(capAEntity);

        ProyectoConstruccionEntity proyB = crearProyectoHelper(tenantB, "PROY-B-01", "Galpón B");

        TenantContext.setCurrentTenant(tenantB);
        PartidaConstruccionEntity partida = new PartidaConstruccionEntity();
        partida.setCapituloId(capA.getId());
        partida.setCodigoCovenin("E-111.100");
        partida.setDescripcion("Deforestación");
        partida.setUnidad("m2");
        partida.setCantidadPresupuestada(new BigDecimal("50.00"));
        partida.setPrecioUnitario(new BigDecimal("2.50"));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            construccionController.crearPartida(proyB.getId(), partida);
        });
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    // 5. IDs enviados al crear se ignoran en todas las entidades
    @Test
    void idsEnviadosAlCrearSeIgnoranEnTodasLasEntidades() {
        long tenant = 88201L;
        TenantContext.setCurrentTenant(tenant);

        // Proyecto con ID forzado
        ProyectoConstruccionEntity p = new ProyectoConstruccionEntity();
        p.setId(99999L);
        p.setCodigo("PROY-FORCED-01");
        p.setNombre("Obra ID Forzado");
        p.setCliente("Cliente Test");
        ResponseEntity<ProyectoConstruccionEntity> respP = construccionController.crearProyecto(p);
        assertNotEquals(99999L, respP.getBody().getId(), "El ID forzado en proyecto debe ignorarse");
        Long proyId = respP.getBody().getId();

        // Capítulo con ID forzado
        CapituloConstruccionEntity c = new CapituloConstruccionEntity();
        c.setId(88888L);
        c.setProyectoId(proyId);
        c.setCodigo("C-01");
        c.setNombre("Capitulo Forzado");
        ResponseEntity<CapituloConstruccionEntity> respC = construccionController.crearCapitulo(c);
        assertNotEquals(88888L, respC.getBody().getId(), "El ID forzado en capítulo debe ignorarse");
        Long capId = respC.getBody().getId();

        // Partida con ID forzado
        PartidaConstruccionEntity part = new PartidaConstruccionEntity();
        part.setId(77777L);
        part.setCapituloId(capId);
        part.setCodigoCovenin("E-100");
        part.setDescripcion("Partida Forzada");
        part.setUnidad("m");
        part.setCantidadPresupuestada(BigDecimal.ONE);
        part.setPrecioUnitario(BigDecimal.ONE);
        ResponseEntity<PartidaConstruccionEntity> respPart = construccionController.crearPartida(proyId, part);
        assertNotEquals(77777L, respPart.getBody().getId(), "El ID forzado en partida debe ignorarse");

        // Insumo con ID forzado
        InsumoConstruccionEntity ins = new InsumoConstruccionEntity();
        ins.setId(66666L);
        ins.setCodigo("INS-FORCED");
        ins.setNombre("Insumo Forzado");
        ins.setTipo("MATERIAL");
        ins.setUnidad("kg");
        ins.setCostoUnitario(BigDecimal.ONE);
        ins.setStockActual(BigDecimal.TEN);
        ResponseEntity<InsumoConstruccionEntity> respIns = construccionController.crearInsumo(ins);
        assertNotEquals(66666L, respIns.getBody().getId(), "El ID forzado en insumo debe ignorarse");

        // Valuación con ID forzado
        ValuacionConstruccionEntity val = new ValuacionConstruccionEntity();
        val.setId(55555L);
        val.setNumeroValuacion(1);
        val.setPeriodoDesde(LocalDate.now());
        val.setPeriodoHasta(LocalDate.now().plusDays(5));
        val.setFechaEmision(LocalDate.now().plusDays(5));
        val.setMontoBruto(BigDecimal.TEN);
        val.setEstado("BORRADOR");
        ResponseEntity<ValuacionConstruccionEntity> respVal = construccionController.crearValuacion(proyId, val);
        assertNotEquals(55555L, respVal.getBody().getId(), "El ID forzado en valuación debe ignorarse");

        // Bitácora con ID forzado
        BitacoraConstruccionEntity bit = new BitacoraConstruccionEntity();
        bit.setId(44444L);
        bit.setFecha(LocalDate.now());
        bit.setClima("NUBLADO");
        bit.setPersonalActivo(3);
        bit.setActividadesEjecutadas("Bitácora ID forzado");
        ResponseEntity<BitacoraConstruccionEntity> respBit = construccionController.agregarBitacora(proyId, bit);
        assertNotEquals(44444L, respBit.getBody().getId(), "El ID forzado en bitácora debe ignorarse");
    }

    // 6. Stock negativo, consumo cero/negativo e inventario insuficiente se rechazan
    @Test
    void stockNegativoConsumoCeroNegativoEInventarioInsuficienteSeRechazan() {
        long tenant = 88301L;
        TenantContext.setCurrentTenant(tenant);

        // 1. Insumo con stock inicial negativo -> BAD_REQUEST
        InsumoConstruccionEntity insNegativo = new InsumoConstruccionEntity();
        insNegativo.setCodigo("INS-NEG-01");
        insNegativo.setNombre("Insumo Negativo");
        insNegativo.setTipo("MATERIAL");
        insNegativo.setUnidad("kg");
        insNegativo.setStockActual(new BigDecimal("-1.00"));
        ResponseStatusException exStockNeg = assertThrows(ResponseStatusException.class, () -> {
            construccionController.crearInsumo(insNegativo);
        });
        assertEquals(HttpStatus.BAD_REQUEST, exStockNeg.getStatusCode());

        // 2. Insumo con stock mínimo negativo -> BAD_REQUEST
        InsumoConstruccionEntity insMinNeg = new InsumoConstruccionEntity();
        insMinNeg.setCodigo("INS-MIN-NEG");
        insMinNeg.setNombre("Insumo Min Negativo");
        insMinNeg.setTipo("MATERIAL");
        insMinNeg.setUnidad("kg");
        insMinNeg.setStockMinimo(new BigDecimal("-10.00"));
        ResponseStatusException exMinNeg = assertThrows(ResponseStatusException.class, () -> {
            construccionController.crearInsumo(insMinNeg);
        });
        assertEquals(HttpStatus.BAD_REQUEST, exMinNeg.getStatusCode());

        // Insumo válido con stock de 15.00 unidades
        InsumoConstruccionEntity insumo = crearInsumoHelper(tenant, "INS-VAL-01", "Arena Lavada", new BigDecimal("15.00"));

        // 3. Consumo cero (0.00) -> BAD_REQUEST
        ResponseStatusException exCero = assertThrows(ResponseStatusException.class, () -> {
            construccionController.registrarConsumo(insumo.getId(), Map.of("cantidad", BigDecimal.ZERO));
        });
        assertEquals(HttpStatus.BAD_REQUEST, exCero.getStatusCode());
        assertTrue(exCero.getReason().contains("estrictamente mayor a cero"));

        // 4. Consumo negativo (-5.00) -> BAD_REQUEST
        ResponseStatusException exConsumoNeg = assertThrows(ResponseStatusException.class, () -> {
            construccionController.registrarConsumo(insumo.getId(), Map.of("cantidad", new BigDecimal("-5.00")));
        });
        assertEquals(HttpStatus.BAD_REQUEST, exConsumoNeg.getStatusCode());
        assertTrue(exConsumoNeg.getReason().contains("estrictamente mayor a cero"));

        // 5. Inventario insuficiente (consumo de 20.00 > stock de 15.00) -> BAD_REQUEST
        ResponseStatusException exInsuficiente = assertThrows(ResponseStatusException.class, () -> {
            construccionController.registrarConsumo(insumo.getId(), Map.of("cantidad", new BigDecimal("20.00")));
        });
        assertEquals(HttpStatus.BAD_REQUEST, exInsuficiente.getStatusCode());
        assertTrue(exInsuficiente.getReason().contains("Stock insuficiente"));
    }

    // 7. Dos consumos concurrentes no pueden descontar el mismo stock dos veces (Protección atómica con UPDATE directo)
    @Test
    void dosConsumosConcurrentes_noPuedenDescontarElMismoStockDosVeces() throws InterruptedException {
        long tenant = 99901L;
        TenantContext.setCurrentTenant(tenant);
        // Stock inicial de 10 unidades
        InsumoConstruccionEntity insumo = crearInsumoHelper(tenant, "INS-CONC-01", "Cemento Estructural", new BigDecimal("10.00"));
        Long insumoId = insumo.getId();

        int numHilos = 2;
        CountDownLatch startSignal = new CountDownLatch(1);
        CountDownLatch doneSignal = new CountDownLatch(numHilos);
        AtomicInteger exitos = new AtomicInteger(0);
        AtomicInteger fallosStockInsuficiente = new AtomicInteger(0);

        for (int i = 0; i < numHilos; i++) {
            new Thread(() -> {
                try {
                    // Esperar la señal de inicio sincronizada para máxima concurrencia
                    startSignal.await();
                    TenantContext.setCurrentTenant(tenant);
                    construccionController.registrarConsumo(insumoId, Map.of("cantidad", new BigDecimal("10.00")));
                    exitos.incrementAndGet();
                } catch (ResponseStatusException ex) {
                    if (ex.getStatusCode() == HttpStatus.BAD_REQUEST && ex.getReason() != null && ex.getReason().contains("Stock insuficiente")) {
                        fallosStockInsuficiente.incrementAndGet();
                    }
                } catch (Exception ignored) {
                } finally {
                    TenantContext.clear();
                    doneSignal.countDown();
                }
            }).start();
        }

        // Disparo simultáneo de ambos hilos
        startSignal.countDown();
        doneSignal.await();

        // Exactamente uno debe tener éxito y el otro debe fallar por stock insuficiente
        assertEquals(1, exitos.get(), "Exactamente uno de los dos consumos concurrentes debe ejecutarse con éxito");
        assertEquals(1, fallosStockInsuficiente.get(), "El segundo consumo concurrente debe ser rechazado por stock insuficiente");

        // Verificar en base de datos que el stock final es exactamente 0.00, nunca negativo ni descontado doble
        InsumoConstruccionEntity insumoFinal = insumoRepository.findByTenantIdAndId(tenant, insumoId).orElseThrow();
        assertEquals(new BigDecimal("0.00"), insumoFinal.getStockActual(), "El stock final debe ser exactamente 0.00");
    }

    // 8. Estados de valuación inválidos se rechazan
    @Test
    void estadosDeValuacionInvalidosSeRechazan() {
        long tenant = 88401L;
        TenantContext.setCurrentTenant(tenant);
        ProyectoConstruccionEntity proy = crearProyectoHelper(tenant, "PROY-VAL-ESTADOS", "Hospital Central");

        // 1. Estado inventado al crear -> BAD_REQUEST
        ValuacionConstruccionEntity valInvalida1 = new ValuacionConstruccionEntity();
        valInvalida1.setNumeroValuacion(1);
        valInvalida1.setPeriodoDesde(LocalDate.now());
        valInvalida1.setPeriodoHasta(LocalDate.now().plusDays(15));
        valInvalida1.setFechaEmision(LocalDate.now().plusDays(15));
        valInvalida1.setMontoBruto(new BigDecimal("1000.00"));
        valInvalida1.setEstado("ESTADO_FANTASMA");
        assertThrows(ResponseStatusException.class, () -> construccionController.crearValuacion(proy.getId(), valInvalida1));

        // 2. Estado vacío al crear -> BAD_REQUEST
        valInvalida1.setEstado("   ");
        assertThrows(ResponseStatusException.class, () -> construccionController.crearValuacion(proy.getId(), valInvalida1));

        // 3. Crear con estado válido BORRADOR -> OK
        valInvalida1.setEstado("BORRADOR");
        ResponseEntity<ValuacionConstruccionEntity> respOk = construccionController.crearValuacion(proy.getId(), valInvalida1);
        assertEquals(HttpStatus.OK, respOk.getStatusCode());
        Long valId = respOk.getBody().getId();

        // 4. Actualizar a estado inválido -> BAD_REQUEST
        assertThrows(ResponseStatusException.class, () -> {
            construccionController.cambiarEstadoValuacion(valId, Map.of("estado", "SUPERVISADA_PIRATA"));
        });

        // 5. Actualizar a estados legítimos en ciclo de vida de valuación
        ResponseEntity<ValuacionConstruccionEntity> r1 = construccionController.cambiarEstadoValuacion(valId, Map.of("estado", "PRESENTADA"));
        assertEquals("PRESENTADA", r1.getBody().getEstado());

        ResponseEntity<ValuacionConstruccionEntity> r2 = construccionController.cambiarEstadoValuacion(valId, Map.of("estado", "APROBADA"));
        assertEquals("APROBADA", r2.getBody().getEstado());

        ResponseEntity<ValuacionConstruccionEntity> r3 = construccionController.cambiarEstadoValuacion(valId, Map.of("estado", "COBRADA"));
        assertEquals("COBRADA", r3.getBody().getEstado());
    }

    // 9. Idempotencia en Valuaciones: reintento de red con misma Idempotency-Key no duplica registros
    @Test
    void idempotenciaValuaciones_reintentoNoDuplicaRegistro() {
        long tenant = 99801L;
        TenantContext.setCurrentTenant(tenant);
        ProyectoConstruccionEntity proy = crearProyectoHelper(tenant, "PROY-IDEMP-01", "Hospital Regional");

        ValuacionConstruccionEntity val = new ValuacionConstruccionEntity();
        val.setNumeroValuacion(1);
        val.setPeriodoDesde(LocalDate.now());
        val.setPeriodoHasta(LocalDate.now().plusDays(15));
        val.setFechaEmision(LocalDate.now().plusDays(15));
        val.setMontoBruto(new BigDecimal("10000.00"));
        val.setEstado("BORRADOR");

        String ik = "IK-VAL-TEST-99801";

        // Primer envío
        ResponseEntity<ValuacionConstruccionEntity> resp1 = construccionController.crearValuacion(proy.getId(), val, ik);
        assertEquals(HttpStatus.OK, resp1.getStatusCode());
        Long id1 = resp1.getBody().getId();

        // Segundo envío idéntico (simulando reintento por timeout / reconexión)
        ResponseEntity<ValuacionConstruccionEntity> resp2 = construccionController.crearValuacion(proy.getId(), val, ik);
        assertEquals(HttpStatus.OK, resp2.getStatusCode());
        Long id2 = resp2.getBody().getId();

        assertEquals(id1, id2, "El reintento con misma Idempotency-Key debe retornar el mismo registro sin duplicar");
        assertEquals(1, valuacionRepository.findByTenantIdAndProyectoIdOrderByNumeroValuacionDesc(tenant, proy.getId()).size());
    }

    // 10. Idempotencia en Consumo de Insumos: reintento no descuenta stock dos veces
    @Test
    void idempotenciaConsumoInsumo_reintentoNoRestaDoble() {
        long tenant = 99802L;
        TenantContext.setCurrentTenant(tenant);
        InsumoConstruccionEntity insumo = crearInsumoHelper(tenant, "INS-IDEMP-01", "Acero Cabilla 1/2", new BigDecimal("50.00"));

        String ik = "IK-CON-TEST-99802";

        // Primer consumo de 10 unidades
        ResponseEntity<InsumoConstruccionEntity> resp1 = construccionController.registrarConsumo(
                insumo.getId(), Map.of("cantidad", new BigDecimal("10.00")), ik);
        assertEquals(HttpStatus.OK, resp1.getStatusCode());
        assertEquals(new BigDecimal("40.00"), resp1.getBody().getStockActual());

        // Reintento idéntico con la misma llave de idempotencia
        ResponseEntity<InsumoConstruccionEntity> resp2 = construccionController.registrarConsumo(
                insumo.getId(), Map.of("cantidad", new BigDecimal("10.00")), ik);
        assertEquals(HttpStatus.OK, resp2.getStatusCode());
        assertEquals(new BigDecimal("40.00"), resp2.getBody().getStockActual(), "El stock debe mantenerse en 40 y no restar doble");
    }

    // 11. Idempotencia en Bitácora: reintento no duplica asientos en el diario de obra
    @Test
    void idempotenciaBitacora_reintentoNoDuplicaEntrada() {
        long tenant = 99803L;
        TenantContext.setCurrentTenant(tenant);
        ProyectoConstruccionEntity proy = crearProyectoHelper(tenant, "PROY-IDEMP-02", "Carretera Troncal");

        BitacoraConstruccionEntity entrada = new BitacoraConstruccionEntity();
        entrada.setFecha(LocalDate.now());
        entrada.setClima("SOLEADO");
        entrada.setPersonalActivo(25);
        entrada.setActividadesEjecutadas("Vaciado de brocales y compactación de base");

        String ik = "IK-BIT-TEST-99803";

        // Primer asiento
        ResponseEntity<BitacoraConstruccionEntity> resp1 = construccionController.agregarBitacora(proy.getId(), entrada, ik);
        assertEquals(HttpStatus.OK, resp1.getStatusCode());
        Long id1 = resp1.getBody().getId();

        // Reintento idéntico
        ResponseEntity<BitacoraConstruccionEntity> resp2 = construccionController.agregarBitacora(proy.getId(), entrada, ik);
        assertEquals(HttpStatus.OK, resp2.getStatusCode());
        Long id2 = resp2.getBody().getId();

        assertEquals(id1, id2, "La bitácora no debe duplicar la entrada bajo reintento con misma Idempotency-Key");
        assertEquals(1, bitacoraRepository.findByTenantIdAndProyectoIdOrderByFechaDesc(tenant, proy.getId()).size());
    }

    // 12. Idempotencia: rechazo con 409 Conflict si se reutiliza la misma clave con payload o recurso diferente
    @Test
    void idempotencia_rechazoPorReutilizacionDeClaveConPayloadDiferente() {
        long tenant = 99804L;
        TenantContext.setCurrentTenant(tenant);
        InsumoConstruccionEntity insumo = crearInsumoHelper(tenant, "INS-IDEMP-DIFF", "Tubo PVC 4 pulg", new BigDecimal("100.00"));
        ProyectoConstruccionEntity proy = crearProyectoHelper(tenant, "PROY-IDEMP-DIFF", "Edificio Prisma");

        String ik = "IK-REUSE-TEST-99804";

        // 1. Primer consumo con cantidad = 10.00 -> OK
        ResponseEntity<InsumoConstruccionEntity> resp1 = construccionController.registrarConsumo(
                insumo.getId(), Map.of("cantidad", new BigDecimal("10.00")), ik);
        assertEquals(HttpStatus.OK, resp1.getStatusCode());
        assertEquals(new BigDecimal("90.00"), resp1.getBody().getStockActual());

        // 2. Mismo IK pero con cantidad = 30.00 (payload diferente) -> 409 CONFLICT
        ResponseStatusException exPayloadDiff = assertThrows(ResponseStatusException.class, () -> {
            construccionController.registrarConsumo(insumo.getId(), Map.of("cantidad", new BigDecimal("30.00")), ik);
        });
        assertEquals(HttpStatus.CONFLICT, exPayloadDiff.getStatusCode());

        // 3. Mismo IK pero en un tipo de recurso diferente (Valuación en lugar de Consumo) -> 409 CONFLICT
        ValuacionConstruccionEntity val = new ValuacionConstruccionEntity();
        val.setNumeroValuacion(1);
        val.setPeriodoDesde(LocalDate.now());
        val.setPeriodoHasta(LocalDate.now().plusDays(10));
        val.setFechaEmision(LocalDate.now().plusDays(10));
        val.setMontoBruto(new BigDecimal("5000.00"));
        val.setEstado("BORRADOR");

        ResponseStatusException exTipoDiff = assertThrows(ResponseStatusException.class, () -> {
            construccionController.crearValuacion(proy.getId(), val, ik);
        });
        assertEquals(HttpStatus.CONFLICT, exTipoDiff.getStatusCode());
    }

    // 13. Idempotencia concurrente: dos peticiones con la misma clave descuentan el stock exactamente una vez
    @Test
    void dosConsumosConcurrentes_conMismaIdempotencyKey_descuentanUnaSolaVez() throws InterruptedException {
        long tenant = 99805L;
        TenantContext.setCurrentTenant(tenant);
        InsumoConstruccionEntity insumo = crearInsumoHelper(tenant, "INS-IDEMP-CONC", "Pintura Epóxica", new BigDecimal("50.00"));
        Long insumoId = insumo.getId();

        String ikConcurrente = "IK-SAME-CONC-99805";
        int numHilos = 2;
        CountDownLatch startSignal = new CountDownLatch(1);
        CountDownLatch doneSignal = new CountDownLatch(numHilos);
        AtomicInteger exitos = new AtomicInteger(0);
        ConcurrentLinkedQueue<Throwable> fallosInesperados = new ConcurrentLinkedQueue<>();

        for (int i = 0; i < numHilos; i++) {
            new Thread(() -> {
                try {
                    startSignal.await();
                    TenantContext.setCurrentTenant(tenant);
                    ResponseEntity<InsumoConstruccionEntity> r = construccionController.registrarConsumo(
                            insumoId, Map.of("cantidad", new BigDecimal("10.00")), ikConcurrente);
                    if (r.getStatusCode() == HttpStatus.OK) {
                        exitos.incrementAndGet();
                    }
                } catch (Throwable t) {
                    fallosInesperados.add(t);
                } finally {
                    TenantContext.clear();
                    doneSignal.countDown();
                }
            }).start();
        }

        startSignal.countDown();
        boolean terminado = doneSignal.await(5, TimeUnit.SECONDS);
        assertTrue(terminado, "Ambos hilos deben culminar dentro del límite");
        assertTrue(fallosInesperados.isEmpty(), "No deben ocurrir excepciones no previstas: " + fallosInesperados);

        // Ambos hilos deben retornar exitosamente (uno ejecuta y el otro recibe el resultado idéntico)
        assertEquals(2, exitos.get(), "Ambas peticiones con misma Idempotency-Key deben terminar con 200 OK");

        // El stock final en base de datos debe ser exactamente 40.00 (descontado una sola vez, de 50 - 10)
        InsumoConstruccionEntity insumoFinal = insumoRepository.findByTenantIdAndId(tenant, insumoId).orElseThrow();
        assertEquals(new BigDecimal("40.00"), insumoFinal.getStockActual(), "El stock debe haberse descontado exactamente una sola vez");
    }

    // 14. Idempotencia determinista: detiene la 1ra petición tras pre-claim; la 2da petición no descuenta stock ni duplica; snapshot congelado
    @Test
    void idempotencia_concurrenciaDeterminista_segundaPeticionNoEjecutaEfecto() throws Exception {
        long tenant = 99806L;
        TenantContext.setCurrentTenant(tenant);
        InsumoConstruccionEntity insumo = crearInsumoHelper(tenant, "INS-DET-LOCK", "Cemento Gris Tipo I", new BigDecimal("100.00"));
        Long insumoId = insumo.getId();

        String ik = "IK-DETERMINISTIC-LOCK-99806";
        CountDownLatch hilo1PreClaimListo = new CountDownLatch(1);
        CountDownLatch liberarHilo1 = new CountDownLatch(1);

        AtomicReference<ResponseEntity<InsumoConstruccionEntity>> respHilo1 = new AtomicReference<>();
        AtomicReference<Throwable> errorHilo1 = new AtomicReference<>();

        // Activar hook determinista para detener al hilo 1 justo tras insertar el pre-claim (EN_PROCESO)
        testPreClaimObserver.setDelegate(() -> {
            hilo1PreClaimListo.countDown();
            try {
                boolean liberado = liberarHilo1.await(5, TimeUnit.SECONDS);
                if (!liberado) {
                    throw new RuntimeException("Timeout esperando liberación de hilo 1");
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });

        Thread hilo1;
        try {
            // Iniciar Hilo 1: intentará descontar 15.00
            hilo1 = new Thread(() -> {
                try {
                    TenantContext.setCurrentTenant(tenant);
                    respHilo1.set(construccionController.registrarConsumo(
                            insumoId, Map.of("cantidad", new BigDecimal("15.00")), ik));
                } catch (Throwable t) {
                    errorHilo1.set(t);
                } finally {
                    TenantContext.clear();
                }
            });
            hilo1.start();

            // Esperar con certeza absoluta a que Hilo 1 haya completado el pre-claim y esté detenido antes del descuento
            boolean listo = hilo1PreClaimListo.await(5, TimeUnit.SECONDS);
            assertTrue(listo, "Hilo 1 debió completar el pre-claim en menos de 5 segundos");

            // Desactivar el hook para que futuras llamadas no se queden detenidas
            testPreClaimObserver.reset();

            // Verificar que en este momento exacto el stock sigue intacto (100.00), porque el efecto aún no ocurrió
            InsumoConstruccionEntity insumoDurantePreClaim = insumoRepository.findByTenantIdAndId(tenant, insumoId).orElseThrow();
            assertEquals(new BigDecimal("100.00"), insumoDurantePreClaim.getStockActual(),
                    "El stock no debe haberse modificado durante el estado EN_PROCESO");

            // Lanzar 2da petición con la MISMA clave mientras la 1ra sigue en EN_PROCESO
            TenantContext.setCurrentTenant(tenant);
            ResponseStatusException exHilo2 = assertThrows(ResponseStatusException.class, () -> {
                construccionController.registrarConsumo(insumoId, Map.of("cantidad", new BigDecimal("15.00")), ik);
            }, "Hilo 2 debe fallar al encontrar la clave en EN_PROCESO");

            assertEquals(HttpStatus.CONFLICT, exHilo2.getStatusCode(),
                    "Hilo 2 debe responder 409 Conflict ('solicitud en proceso')");

            // Verificar de nuevo que la 2da petición NO descontó inventario: el stock sigue en 100.00
            InsumoConstruccionEntity insumoTrasHilo2 = insumoRepository.findByTenantIdAndId(tenant, insumoId).orElseThrow();
            assertEquals(new BigDecimal("100.00"), insumoTrasHilo2.getStockActual(),
                    "Hilo 2 no debe haber descontado stock bajo ninguna circunstancia");

            // Liberar al Hilo 1 para que complete su ejecución
            liberarHilo1.countDown();
            hilo1.join(5000);

            // Verificar que Hilo 1 terminó exitosamente y sin excepciones
            assertNull(errorHilo1.get(), "Hilo 1 no debe arrojar excepciones");
            assertNotNull(respHilo1.get(), "Hilo 1 debió retornar respuesta");
            assertEquals(HttpStatus.OK, respHilo1.get().getStatusCode());
            assertEquals(new BigDecimal("85.00"), respHilo1.get().getBody().getStockActual());

            // Verificar que el stock final en BD es exactamente 85.00 (descontado una sola vez)
            InsumoConstruccionEntity insumoFinal = insumoRepository.findByTenantIdAndId(tenant, insumoId).orElseThrow();
            assertEquals(new BigDecimal("85.00"), insumoFinal.getStockActual());

            // Simular otro consumo posterior con OTRA clave (descontar 20 más -> 65.00)
            String otraIk = "IK-OTRO-CONSUMO-99806";
            ResponseEntity<InsumoConstruccionEntity> respOtro = construccionController.registrarConsumo(
                    insumoId, Map.of("cantidad", new BigDecimal("20.00")), otraIk);
            assertEquals(new BigDecimal("65.00"), respOtro.getBody().getStockActual());

            // Reconsultar con la clave original 'ik': debe devolver el resultado original congelado (85.00), no el actual (65.00)
            ResponseEntity<InsumoConstruccionEntity> respReintento1 = construccionController.registrarConsumo(
                    insumoId, Map.of("cantidad", new BigDecimal("15.00")), ik);
            assertEquals(new BigDecimal("85.00"), respReintento1.getBody().getStockActual(),
                    "El reintento con la clave original debe devolver el stock snapshot de ese consumo (85.00), no el inventario actual (65.00)");

        } finally {
            testPreClaimObserver.reset();
            liberarHilo1.countDown();
            TenantContext.clear();
        }
    }
}
