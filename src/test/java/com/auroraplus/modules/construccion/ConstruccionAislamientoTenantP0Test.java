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

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        if (testPreClaimObserver != null) {
            testPreClaimObserver.reset();
        }
        TenantContext.clear();
    }

    @Autowired
    private ProyectoConstruccionRepository proyectoRepository;

    @Autowired
    private CapituloConstruccionRepository capituloRepository;

    @Autowired
    private PartidaConstruccionRepository partidaRepository;

    @Autowired
    private DespachoConstruccionRepository despachoRepository;

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

        ResponseStatusException exActProy = assertThrows(ResponseStatusException.class, () -> construccionController.actualizarProyecto(1L, new ProyectoConstruccionEntity()));
        assertEquals(HttpStatus.UNAUTHORIZED, exActProy.getStatusCode());

        ResponseStatusException exElimProy = assertThrows(ResponseStatusException.class, () -> construccionController.eliminarProyecto(1L));
        assertEquals(HttpStatus.UNAUTHORIZED, exElimProy.getStatusCode());

        ResponseStatusException exListCapProy = assertThrows(ResponseStatusException.class, () -> construccionController.listarCapitulosPorProyecto(1L));
        assertEquals(HttpStatus.UNAUTHORIZED, exListCapProy.getStatusCode());

        ResponseStatusException exCrearCapProy = assertThrows(ResponseStatusException.class, () -> construccionController.crearCapituloEnProyecto(1L, new CapituloConstruccionEntity()));
        assertEquals(HttpStatus.UNAUTHORIZED, exCrearCapProy.getStatusCode());

        ResponseStatusException exActPart = assertThrows(ResponseStatusException.class, () -> construccionController.actualizarPartida(1L, new PartidaConstruccionEntity()));
        assertEquals(HttpStatus.UNAUTHORIZED, exActPart.getStatusCode());

        ResponseStatusException exListDesp = assertThrows(ResponseStatusException.class, () -> construccionController.listarDespachos(1L));
        assertEquals(HttpStatus.UNAUTHORIZED, exListDesp.getStatusCode());

        ResponseStatusException exCrearDesp = assertThrows(ResponseStatusException.class, () -> construccionController.crearDespacho(1L, new DespachoConstruccionEntity()));
        assertEquals(HttpStatus.UNAUTHORIZED, exCrearDesp.getStatusCode());

        ResponseStatusException exObtDesp = assertThrows(ResponseStatusException.class, () -> construccionController.obtenerDespacho(1L));
        assertEquals(HttpStatus.UNAUTHORIZED, exObtDesp.getStatusCode());

        ResponseStatusException exPatchDesp = assertThrows(ResponseStatusException.class, () -> construccionController.cambiarEstadoDespacho(1L, Map.of("estado", "RECIBIDO")));
        assertEquals(HttpStatus.UNAUTHORIZED, exPatchDesp.getStatusCode());

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

        DespachoConstruccionEntity dA = new DespachoConstruccionEntity();
        dA.setTenantId(tenantA);
        dA.setProyectoId(proyA.getId());
        dA.setGuiaNumero("GUIA-ISO-A-001");
        dA.setTipoMaterial("CONCRETO_PREMEZCLADO");
        dA.setOrigen("Planta A");
        dA.setDestinoFrente("Frente 1");
        dA.setCantidad(new BigDecimal("8.00"));
        dA.setEstado("EN_TRANSITO");
        DespachoConstruccionEntity despA = despachoRepository.save(dA);
        final Long despAId = despA.getId();

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

        // 5. BORRAR Y EDITAR NUEVOS ENDPOINTS: Tenant B no puede tocar recursos de A
        ResponseStatusException exListCapProy = assertThrows(ResponseStatusException.class, () -> construccionController.listarCapitulosPorProyecto(proyAId));
        assertEquals(HttpStatus.NOT_FOUND, exListCapProy.getStatusCode());

        CapituloConstruccionEntity capB = new CapituloConstruccionEntity();
        capB.setCodigo("2.0");
        capB.setNombre("Inyeccion capitulo ilicito");
        ResponseStatusException exCrearCapProy = assertThrows(ResponseStatusException.class, () -> construccionController.crearCapituloEnProyecto(proyAId, capB));
        assertEquals(HttpStatus.NOT_FOUND, exCrearCapProy.getStatusCode());

        ProyectoConstruccionEntity modProy = new ProyectoConstruccionEntity();
        modProy.setNombre("Nombre hackeado");
        ResponseStatusException exActProy = assertThrows(ResponseStatusException.class, () -> construccionController.actualizarProyecto(proyAId, modProy));
        assertEquals(HttpStatus.NOT_FOUND, exActProy.getStatusCode());

        ResponseStatusException exElimProy = assertThrows(ResponseStatusException.class, () -> construccionController.eliminarProyecto(proyAId));
        assertEquals(HttpStatus.NOT_FOUND, exElimProy.getStatusCode());

        PartidaConstruccionEntity modPart = new PartidaConstruccionEntity();
        modPart.setDescripcion("Descripcion alterada");
        ResponseStatusException exActPart = assertThrows(ResponseStatusException.class, () -> construccionController.actualizarPartida(partidaAId, modPart));
        assertEquals(HttpStatus.NOT_FOUND, exActPart.getStatusCode());

        ResponseStatusException exBorrarPart = assertThrows(ResponseStatusException.class, () -> construccionController.eliminarPartida(partidaAId));
        assertEquals(HttpStatus.NOT_FOUND, exBorrarPart.getStatusCode());

        // Tenant B no puede listar, leer, crear ni modificar despachos de A
        ResponseStatusException exListDespB = assertThrows(ResponseStatusException.class, () -> construccionController.listarDespachos(proyAId));
        assertEquals(HttpStatus.NOT_FOUND, exListDespB.getStatusCode());

        ResponseEntity<DespachoConstruccionEntity> respDespLectura = construccionController.obtenerDespacho(despAId);
        assertEquals(HttpStatus.NOT_FOUND, respDespLectura.getStatusCode());

        DespachoConstruccionEntity despIlicito = new DespachoConstruccionEntity();
        despIlicito.setGuiaNumero("GUIA-HACK-002");
        despIlicito.setTipoMaterial("ACERO_CABILLAS");
        despIlicito.setOrigen("Cantera X");
        despIlicito.setDestinoFrente("Frente Ilicito");
        ResponseStatusException exCrearDespB = assertThrows(ResponseStatusException.class, () -> construccionController.crearDespacho(proyAId, despIlicito));
        assertEquals(HttpStatus.NOT_FOUND, exCrearDespB.getStatusCode());

        ResponseStatusException exPatchDespB = assertThrows(ResponseStatusException.class, () -> construccionController.cambiarEstadoDespacho(despAId, Map.of("estado", "RECIBIDO")));
        assertEquals(HttpStatus.NOT_FOUND, exPatchDespB.getStatusCode());

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

    // 15. Logística y Despachos: aislamiento, validación de estados e idempotencia
    @Test
    void despachos_aislamientoEstadosEIdempotencia() {
        long tenant = 99910L;
        TenantContext.setCurrentTenant(tenant);

        ProyectoConstruccionEntity proy = crearProyectoHelper(tenant, "PROY-LOG-01", "Complejo Logístico Norte");
        Long proyId = proy.getId();

        // 1. Crear despacho exitoso con Idempotency-Key
        DespachoConstruccionEntity desp = new DespachoConstruccionEntity();
        desp.setGuiaNumero("GUIA-LOG-001");
        desp.setTipoMaterial("CONCRETO_PREMEZCLADO");
        desp.setOrigen("Planta Central");
        desp.setDestinoFrente("Losa Fundaciones");
        desp.setUnidadTransporte("Mixer Mack #10");
        desp.setChofer("Manuel Rodríguez");
        desp.setCantidad(new BigDecimal("7.50"));
        desp.setUnidadMedida("m3");
        desp.setSlumpConoPulgadas(new BigDecimal("5.50"));

        String ik = "IK-DESP-001-99910";
        ResponseEntity<DespachoConstruccionEntity> resp1 = construccionController.crearDespacho(proyId, desp, ik);
        assertEquals(HttpStatus.OK, resp1.getStatusCode());
        assertNotNull(resp1.getBody());
        assertEquals("EN_TRANSITO", resp1.getBody().getEstado());
        Long despId = resp1.getBody().getId();

        // 2. Reintento idempotente: devuelve el mismo recurso sin duplicar en base de datos
        ResponseEntity<DespachoConstruccionEntity> respReintento = construccionController.crearDespacho(proyId, desp, ik);
        assertEquals(HttpStatus.OK, respReintento.getStatusCode());
        assertEquals(despId, respReintento.getBody().getId());

        List<DespachoConstruccionEntity> lista = construccionController.listarDespachos(proyId);
        assertEquals(1, lista.size(), "No debe haber duplicados por reintento idempotente");

        // 3. Rechazo de estado inválido
        ResponseStatusException exEstado = assertThrows(ResponseStatusException.class, () ->
                construccionController.cambiarEstadoDespacho(despId, Map.of("estado", "ESTADO_INEXISTENTE"))
        );
        assertEquals(HttpStatus.BAD_REQUEST, exEstado.getStatusCode());

        // 4. Transición exitosa a RECIBIDO
        ResponseEntity<DespachoConstruccionEntity> respRecibido = construccionController.cambiarEstadoDespacho(
                despId, Map.of("estado", "RECIBIDO", "observaciones", "Concreto certificado con cono 5.5")
        );
        assertEquals(HttpStatus.OK, respRecibido.getStatusCode());
        assertEquals("RECIBIDO", respRecibido.getBody().getEstado());
        assertNotNull(respRecibido.getBody().getFechaHoraLlegada());

        // 5. Rechazo al intentar asociar insumo de otro tenant
        long tenantOtro = 99911L;
        TenantContext.setCurrentTenant(tenantOtro);
        InsumoConstruccionEntity insumoAjeno = crearInsumoHelper(tenantOtro, "INS-AJENO", "Acero Ajeno", new BigDecimal("100.00"));
        Long insumoAjenoId = insumoAjeno.getId();

        TenantContext.setCurrentTenant(tenant);
        DespachoConstruccionEntity despConInsumoAjeno = new DespachoConstruccionEntity();
        despConInsumoAjeno.setGuiaNumero("GUIA-AJENA-002");
        despConInsumoAjeno.setTipoMaterial("ACERO_CABILLAS");
        despConInsumoAjeno.setOrigen("Siderúrgica");
        despConInsumoAjeno.setDestinoFrente("Patio");
        despConInsumoAjeno.setInsumoId(insumoAjenoId);

        ResponseStatusException exInsumo = assertThrows(ResponseStatusException.class, () ->
                construccionController.crearDespacho(proyId, despConInsumoAjeno, "IK-DESP-CROSS")
        );
        assertEquals(HttpStatus.BAD_REQUEST, exInsumo.getStatusCode());
    }

    @Test
    void maquinaria_aislamientoHorometroMantenimientoEIdempotencia() {
        long tenant1 = 77710L;
        TenantContext.setCurrentTenant(tenant1);
        ProyectoConstruccionEntity proy = crearProyectoHelper(tenant1, "PROY-MAQ-01", "Puente Rio Neveri");
        Long proyId = proy.getId();

        // 1. Registro de maquinaria con idempotencia
        MaquinariaConstruccionEntity maq = new MaquinariaConstruccionEntity();
        maq.setCodigo("EXC-01");
        maq.setNombre("Excavadora Caterpillar 320D");
        maq.setTipo("PESADA");
        maq.setMarca("Caterpillar");
        maq.setModelo("320D");
        maq.setHorometroActual(new BigDecimal("1250.50"));
        maq.setProyectoId(proyId);
        maq.setCostoHoraUsd(new BigDecimal("85.00"));
        maq.setOperadorResponsable("Carlos Mendoza");

        String ik = "IK-MAQ-TEST-001";
        ResponseEntity<MaquinariaConstruccionEntity> resp1 = construccionController.registrarMaquinaria(maq, ik);
        assertEquals(HttpStatus.OK, resp1.getStatusCode());
        assertNotNull(resp1.getBody().getId());
        Long maqId = resp1.getBody().getId();
        assertEquals("OPERATIVO", resp1.getBody().getEstado());

        // 2. Reintento idempotente devuelve el mismo id
        ResponseEntity<MaquinariaConstruccionEntity> respReintento = construccionController.registrarMaquinaria(maq, ik);
        assertEquals(HttpStatus.OK, respReintento.getStatusCode());
        assertEquals(maqId, respReintento.getBody().getId());

        List<MaquinariaConstruccionEntity> lista1 = construccionController.listarMaquinarias(proyId);
        assertEquals(1, lista1.size(), "No debe haber duplicados por idempotencia");

        // 3. Validacion de horometro: no puede retroceder
        ResponseStatusException exRetroceso = assertThrows(ResponseStatusException.class, () ->
                construccionController.actualizarHorometro(maqId, Map.of("horometro", "1000.00"))
        );
        assertEquals(HttpStatus.BAD_REQUEST, exRetroceso.getStatusCode());

        // Actualizacion valida de horometro
        ResponseEntity<MaquinariaConstruccionEntity> respHorom = construccionController.actualizarHorometro(
                maqId, Map.of("horometro", "1265.00", "operador", "Pedro Gomez")
        );
        assertEquals(HttpStatus.OK, respHorom.getStatusCode());
        assertEquals(new BigDecimal("1265.00"), respHorom.getBody().getHorometroActual());
        assertEquals("Pedro Gomez", respHorom.getBody().getOperadorResponsable());

        // 4. Registro de mantenimiento preventivo
        MantenimientoMaquinariaEntity mant = new MantenimientoMaquinariaEntity();
        mant.setTipo("PREVENTIVO");
        mant.setFechaMantenimiento(java.time.LocalDate.now());
        mant.setHorometroEnMantenimiento(new BigDecimal("1265.00"));
        mant.setDescripcionTrabajo("Cambio de aceite motor 15W40 y juego completo de filtros");
        mant.setMecanicoOTaller("Taller Central Diesel");
        mant.setCostoTotalUsd(new BigDecimal("350.00"));

        ResponseEntity<MantenimientoMaquinariaEntity> respMant = construccionController.registrarMantenimiento(maqId, mant);
        assertEquals(HttpStatus.OK, respMant.getStatusCode());
        assertNotNull(respMant.getBody().getId());

        List<MantenimientoMaquinariaEntity> historico = construccionController.listarMantenimientos(maqId);
        assertEquals(1, historico.size());
        assertEquals("PREVENTIVO", historico.get(0).getTipo());

        // 5. Aislamiento Cross-Tenant
        long tenantAjeno = 88833L;
        TenantContext.setCurrentTenant(tenantAjeno);

        // No ve maquinarias de otro tenant
        List<MaquinariaConstruccionEntity> listaAjena = construccionController.listarMaquinarias(null);
        assertTrue(listaAjena.isEmpty(), "Tenant ajeno no debe ver maquinarias de otro tenant");

        // Obtener por ID ajeno -> 404
        ResponseEntity<MaquinariaConstruccionEntity> respObtenerAjeno = construccionController.obtenerMaquinaria(maqId);
        assertEquals(HttpStatus.NOT_FOUND, respObtenerAjeno.getStatusCode());

        // Actualizar horometro ajeno -> 404
        ResponseStatusException exHoromAjeno = assertThrows(ResponseStatusException.class, () ->
                construccionController.actualizarHorometro(maqId, Map.of("horometro", "1300.00"))
        );
        assertEquals(HttpStatus.NOT_FOUND, exHoromAjeno.getStatusCode());

        // Registrar mantenimiento en maquina ajena -> 404
        ResponseStatusException exMantAjeno = assertThrows(ResponseStatusException.class, () ->
                construccionController.registrarMantenimiento(maqId, mant)
        );
        assertEquals(HttpStatus.NOT_FOUND, exMantAjeno.getStatusCode());

        // Asignar proyecto de otro tenant -> 400
        MaquinariaConstruccionEntity maqCrossProy = new MaquinariaConstruccionEntity();
        maqCrossProy.setCodigo("RET-09");
        maqCrossProy.setNombre("Retroexcavadora");
        maqCrossProy.setTipo("PESADA");
        maqCrossProy.setProyectoId(proyId); // Proyecto de tenant1

        ResponseStatusException exCrossProy = assertThrows(ResponseStatusException.class, () ->
                construccionController.registrarMaquinaria(maqCrossProy, "IK-MAQ-CROSS")
        );
        assertEquals(HttpStatus.BAD_REQUEST, exCrossProy.getStatusCode());
    }

    @Test
    void riesgos_aislamientoCalculoMatrizEIdempotencia() {
        long tenant1 = 66611L;
        TenantContext.setCurrentTenant(tenant1);
        ProyectoConstruccionEntity proy = crearProyectoHelper(tenant1, "PROY-SST-01", "Edificio Residencial Las Aves");
        Long proyId = proy.getId();

        // 1. Registro de riesgo IPERC con calculo automatico de matriz
        RiesgoConstruccionEntity rsk = new RiesgoConstruccionEntity();
        rsk.setCodigo("RSK-01");
        rsk.setProcesoFrente("Vaciado de Losa Nivel +8.00");
        rsk.setPeligro("Borde de placa sin barandillas de proteccion perimetral ni linea de vida");
        rsk.setRiesgoConsecuencia("Caida a distinto nivel con traumatismo craneoencefalico severo");
        rsk.setCategoria("ALTURA");
        rsk.setProbabilidad(4); // Alta
        rsk.setSeveridad(5);    // Catastrofica
        rsk.setMedidasControl("Instalacion de red perimetral, barandilla rigida a 1.20m y uso obligatorio de arnes certificado con doble cabo de vida");
        rsk.setResponsable("Ing. Inspector de Seguridad SST");
        rsk.setFechaEvaluacion(java.time.LocalDate.now());

        String ik = "IK-RSK-TEST-001";
        ResponseEntity<RiesgoConstruccionEntity> resp1 = construccionController.registrarRiesgo(proyId, rsk, ik);
        assertEquals(HttpStatus.OK, resp1.getStatusCode());
        assertNotNull(resp1.getBody().getId());
        Long rskId = resp1.getBody().getId();
        // 4 * 5 = 20 -> CRITICO
        assertEquals("CRITICO", resp1.getBody().getNivelRiesgo());
        assertEquals("IDENTIFICADO", resp1.getBody().getEstado());

        // 2. Reintento idempotente devuelve el mismo id
        ResponseEntity<RiesgoConstruccionEntity> respReintento = construccionController.registrarRiesgo(proyId, rsk, ik);
        assertEquals(HttpStatus.OK, respReintento.getStatusCode());
        assertEquals(rskId, respReintento.getBody().getId());

        List<RiesgoConstruccionEntity> lista = construccionController.listarRiesgos(proyId);
        assertEquals(1, lista.size(), "No debe haber duplicados por idempotencia");

        // 3. Actualizacion de estado y agregado de mitigacion
        ResponseEntity<RiesgoConstruccionEntity> respMitigado = construccionController.cambiarEstadoRiesgo(
                rskId, Map.of("estado", "EN_MITIGACION", "medidasControl", "Barandillas instaladas e inspeccionadas en faena matutina")
        );
        assertEquals(HttpStatus.OK, respMitigado.getStatusCode());
        assertEquals("EN_MITIGACION", respMitigado.getBody().getEstado());
        assertTrue(respMitigado.getBody().getMedidasControl().contains("Barandillas instaladas"));

        // 4. Intento de duplicar codigo en el mismo proyecto con otra clave -> 409 CONFLICT
        RiesgoConstruccionEntity rskDuplicado = new RiesgoConstruccionEntity();
        rskDuplicado.setCodigo("RSK-01");
        rskDuplicado.setProcesoFrente("Otro Frente");
        rskDuplicado.setPeligro("Peligro X");
        rskDuplicado.setRiesgoConsecuencia("Danio X");
        rskDuplicado.setMedidasControl("Control X");
        rskDuplicado.setFechaEvaluacion(java.time.LocalDate.now());

        ResponseStatusException exConflicto = assertThrows(ResponseStatusException.class, () ->
                construccionController.registrarRiesgo(proyId, rskDuplicado, "IK-RSK-OTRA-CLAVE")
        );
        assertEquals(HttpStatus.CONFLICT, exConflicto.getStatusCode());

        // 5. Aislamiento Cross-Tenant
        long tenantAjeno = 77799L;
        TenantContext.setCurrentTenant(tenantAjeno);

        // Listar riesgos de proyecto ajeno -> 404
        ResponseStatusException exListarAjeno = assertThrows(ResponseStatusException.class, () ->
                construccionController.listarRiesgos(proyId)
        );
        assertEquals(HttpStatus.NOT_FOUND, exListarAjeno.getStatusCode());

        // Obtener riesgo ajeno -> 404
        ResponseEntity<RiesgoConstruccionEntity> respObtenerAjeno = construccionController.obtenerRiesgo(rskId);
        assertEquals(HttpStatus.NOT_FOUND, respObtenerAjeno.getStatusCode());

        // Cambiar estado de riesgo ajeno -> 404
        ResponseStatusException exEstadoAjeno = assertThrows(ResponseStatusException.class, () ->
                construccionController.cambiarEstadoRiesgo(rskId, Map.of("estado", "RESUELTO"))
        );
        assertEquals(HttpStatus.NOT_FOUND, exEstadoAjeno.getStatusCode());

        // Registrar riesgo en proyecto ajeno -> 404
        ResponseStatusException exCrearEnAjeno = assertThrows(ResponseStatusException.class, () ->
                construccionController.registrarRiesgo(proyId, rskDuplicado, "IK-RSK-CROSS")
        );
        assertEquals(HttpStatus.NOT_FOUND, exCrearEnAjeno.getStatusCode());
    }

    @Test
    void bimYRfi_aislamientoControlVersionesEIdempotencia() {
        long tenant1 = 55512L;
        TenantContext.setCurrentTenant(tenant1);
        ProyectoConstruccionEntity proy = crearProyectoHelper(tenant1, "PROY-BIM-01", "Torre Financiera Orinoco");
        Long proyId = proy.getId();

        // 1. Registro de Modelo BIM / IFC con idempotencia
        DocumentoBimEntity bim = new DocumentoBimEntity();
        bim.setCodigo("BIM-EST-01");
        bim.setTitulo("Modelo Estructural de Superestructura y Vigas Nivel +4.00");
        bim.setDisciplina("ESTRUCTURAS");
        bim.setFormato("IFC");
        bim.setVersion("v1.0");
        bim.setAutorProyectista("Ing. Calculista Soto");
        bim.setArchivoUrl("https://storage.auroraplus.com/proyectos/bim/BIM-EST-01_v1.ifc");
        bim.setPesoMb(new BigDecimal("145.50"));

        String ikBim = "IK-BIM-TEST-001";
        ResponseEntity<DocumentoBimEntity> respBim1 = construccionController.registrarDocumentoBim(proyId, bim, ikBim);
        assertEquals(HttpStatus.OK, respBim1.getStatusCode());
        assertNotNull(respBim1.getBody().getId());
        Long bimId = respBim1.getBody().getId();
        assertEquals("VIGENTE", respBim1.getBody().getEstadoRevision());

        // 2. Reintento idempotente devuelve el mismo id
        ResponseEntity<DocumentoBimEntity> respBimReintento = construccionController.registrarDocumentoBim(proyId, bim, ikBim);
        assertEquals(HttpStatus.OK, respBimReintento.getStatusCode());
        assertEquals(bimId, respBimReintento.getBody().getId());

        List<DocumentoBimEntity> listaBim = construccionController.listarDocumentosBim(proyId, null);
        assertEquals(1, listaBim.size(), "No debe haber duplicados en BIM por idempotencia");

        // 3. Cambio de estado a APROBADO_PARA_CONSTRUCCION
        ResponseEntity<DocumentoBimEntity> respEstadoBim = construccionController.cambiarEstadoDocumentoBim(
                bimId, Map.of("estado", "APROBADO_PARA_CONSTRUCCION")
        );
        assertEquals(HttpStatus.OK, respEstadoBim.getStatusCode());
        assertEquals("APROBADO_PARA_CONSTRUCCION", respEstadoBim.getBody().getEstadoRevision());

        // 4. Registro de RFI asociado al modelo BIM
        RfiConstruccionEntity rfi = new RfiConstruccionEntity();
        rfi.setNumeroRfi("RFI-001");
        rfi.setAsunto("Interferencia de tuberia de 6 pulgadas con viga de carga Eje 4");
        rfi.setDisciplina("MEP");
        rfi.setPreguntaConsulta("Se solicita autorizacion tecnica para pase de tuberia sanitaria en alma de viga V-102 segun cota +3.40m");
        rfi.setSolicitante("Ing. Residente Carlos Mendoza");
        rfi.setDocumentoBimId(bimId);
        rfi.setFechaLimite(java.time.LocalDate.now().plusDays(3));

        String ikRfi = "IK-RFI-TEST-001";
        ResponseEntity<RfiConstruccionEntity> respRfi1 = construccionController.registrarRfi(proyId, rfi, ikRfi);
        assertEquals(HttpStatus.OK, respRfi1.getStatusCode());
        assertNotNull(respRfi1.getBody().getId());
        Long rfiId = respRfi1.getBody().getId();
        assertEquals("ABIERTO", respRfi1.getBody().getEstado());

        // Reintento idempotente RFI
        ResponseEntity<RfiConstruccionEntity> respRfiReintento = construccionController.registrarRfi(proyId, rfi, ikRfi);
        assertEquals(HttpStatus.OK, respRfiReintento.getStatusCode());
        assertEquals(rfiId, respRfiReintento.getBody().getId());

        // 5. Respuesta Oficial al RFI
        ResponseEntity<RfiConstruccionEntity> respRfiRespuesta = construccionController.responderRfi(
                rfiId, Map.of(
                        "respuestaOficial", "Se aprueba pase con encamisado de acero y refuerzo de 2 cabillas #5 segun detalle E-15",
                        "responsableRespuesta", "Ing. Calculista Soto",
                        "estado", "RESPONDIDO"
                )
        );
        assertEquals(HttpStatus.OK, respRfiRespuesta.getStatusCode());
        assertEquals("RESPONDIDO", respRfiRespuesta.getBody().getEstado());
        assertEquals("Ing. Calculista Soto", respRfiRespuesta.getBody().getResponsableRespuesta());
        assertNotNull(respRfiRespuesta.getBody().getFechaRespuesta());

        // 6. Aislamiento Cross-Tenant
        long tenantAjeno = 44488L;
        TenantContext.setCurrentTenant(tenantAjeno);

        // Listar BIM ajeno -> 404
        ResponseStatusException exBimAjeno = assertThrows(ResponseStatusException.class, () ->
                construccionController.listarDocumentosBim(proyId, null)
        );
        assertEquals(HttpStatus.NOT_FOUND, exBimAjeno.getStatusCode());

        // Obtener BIM ajeno -> 404
        ResponseEntity<DocumentoBimEntity> respGetBimAjeno = construccionController.obtenerDocumentoBim(bimId);
        assertEquals(HttpStatus.NOT_FOUND, respGetBimAjeno.getStatusCode());

        // Listar RFIs ajenos -> 404
        ResponseStatusException exListarRfisAjeno = assertThrows(ResponseStatusException.class, () ->
                construccionController.listarRfis(proyId)
        );
        assertEquals(HttpStatus.NOT_FOUND, exListarRfisAjeno.getStatusCode());

        // Responder RFI ajeno -> 404
        ResponseStatusException exRespRfiAjeno = assertThrows(ResponseStatusException.class, () ->
                construccionController.responderRfi(rfiId, Map.of("respuestaOficial", "Hack"))
        );
        assertEquals(HttpStatus.NOT_FOUND, exRespRfiAjeno.getStatusCode());

        // Crear RFI en proyecto propio pero intentando linkear documento BIM de otro tenant -> 400 BAD_REQUEST
        ProyectoConstruccionEntity proyAjeno = crearProyectoHelper(tenantAjeno, "PROY-AJENO", "Hospital Central");
        Long proyAjenoId = proyAjeno.getId();

        RfiConstruccionEntity rfiCrossBim = new RfiConstruccionEntity();
        rfiCrossBim.setNumeroRfi("RFI-002");
        rfiCrossBim.setAsunto("Consulta Cross");
        rfiCrossBim.setPreguntaConsulta("Pregunta");
        rfiCrossBim.setSolicitante("Ing. X");
        rfiCrossBim.setDocumentoBimId(bimId); // BIM de tenant 1

        ResponseStatusException exCrossBim = assertThrows(ResponseStatusException.class, () ->
                construccionController.registrarRfi(proyAjenoId, rfiCrossBim, "IK-RFI-CROSS")
        );
        assertEquals(HttpStatus.BAD_REQUEST, exCrossBim.getStatusCode());
    }

    @Test
    void cuadrillas_aislamientoPersonalPartidaEIdempotencia() {
        long tenant1 = 33311L;
        TenantContext.setCurrentTenant(tenant1);
        ProyectoConstruccionEntity proy = crearProyectoHelper(tenant1, "PROY-CD-01", "Complejo Habitacional El Roble");
        Long proyId = proy.getId();

        CapituloConstruccionEntity c = new CapituloConstruccionEntity();
        c.setProyectoId(proyId);
        c.setCodigo("03");
        c.setNombre("Estructuras de Concreto");
        ResponseEntity<CapituloConstruccionEntity> respC = construccionController.crearCapitulo(c);
        Long capId = respC.getBody().getId();

        PartidaConstruccionEntity part = new PartidaConstruccionEntity();
        part.setCapituloId(capId);
        part.setCodigoCovenin("E-311.100");
        part.setDescripcion("Encofrado de vigas y losas");
        part.setUnidad("m2");
        part.setCantidadPresupuestada(new BigDecimal("500.00"));
        part.setPrecioUnitario(new BigDecimal("20.00"));
        ResponseEntity<PartidaConstruccionEntity> respPart = construccionController.crearPartida(proyId, part);
        Long partId = respPart.getBody().getId();

        // 1. Registro de cuadrilla con calculo de personal y vinculacion a partida
        CuadrillaConstruccionEntity cd = new CuadrillaConstruccionEntity();
        cd.setCodigo("CD-ENC-01");
        cd.setNombre("Cuadrilla 1 Encofrado de Losas");
        cd.setEspecialidad("CONCRETO_Y_ENCOFRADO");
        cd.setFrenteTrabajo("Planta Alta Ejes 1-6");
        cd.setCapatazResponsable("Maestro Juan Barreto");
        cd.setCantidadOficiales(2);
        cd.setCantidadAyudantes(3);
        cd.setPartidaId(partId);
        cd.setRendimientoDiarioEstimado(new BigDecimal("45.00"));
        cd.setUnidadMedidaRendimiento("m2/dia");
        cd.setFechaInicio(java.time.LocalDate.now());

        String ik = "IK-CD-TEST-001";
        ResponseEntity<CuadrillaConstruccionEntity> resp1 = construccionController.registrarCuadrilla(proyId, cd, ik);
        assertEquals(HttpStatus.OK, resp1.getStatusCode());
        assertNotNull(resp1.getBody().getId());
        Long cdId = resp1.getBody().getId();
        assertEquals(5, resp1.getBody().getCantidadTotalPersonal(), "Total personal debe ser la suma de oficiales y ayudantes");
        assertEquals("ACTIVA", resp1.getBody().getEstado());

        // 2. Reintento idempotente devuelve el mismo ID con el payload idéntico
        ResponseEntity<CuadrillaConstruccionEntity> respReintento = construccionController.registrarCuadrilla(proyId, cd, ik);
        assertEquals(HttpStatus.OK, respReintento.getStatusCode());
        assertEquals(cdId, respReintento.getBody().getId());

        // 2.1 Reintento con la misma clave pero payload alterado (ej. cambio en oficiales) es rechazado con 409
        CuadrillaConstruccionEntity cdPayloadAlterado = new CuadrillaConstruccionEntity();
        cdPayloadAlterado.setCodigo(cd.getCodigo());
        cdPayloadAlterado.setNombre(cd.getNombre());
        cdPayloadAlterado.setEspecialidad(cd.getEspecialidad());
        cdPayloadAlterado.setFrenteTrabajo(cd.getFrenteTrabajo());
        cdPayloadAlterado.setCapatazResponsable(cd.getCapatazResponsable());
        cdPayloadAlterado.setCantidadOficiales(10); // Alterado de 2 a 10
        cdPayloadAlterado.setCantidadAyudantes(3);
        cdPayloadAlterado.setPartidaId(partId);
        cdPayloadAlterado.setFechaInicio(cd.getFechaInicio());

        ResponseStatusException exPayloadMismatch = assertThrows(ResponseStatusException.class, () ->
                construccionController.registrarCuadrilla(proyId, cdPayloadAlterado, ik)
        );
        assertEquals(HttpStatus.CONFLICT, exPayloadMismatch.getStatusCode(), "Debe rechazar reintento con payload distinto bajo la misma clave");

        List<CuadrillaConstruccionEntity> lista = construccionController.listarCuadrillas(proyId);
        assertEquals(1, lista.size(), "No debe haber cuadrillas duplicadas por reintento idempotente");

        // 3. Reasignacion de frente de trabajo y estado
        ResponseEntity<CuadrillaConstruccionEntity> respUpdate = construccionController.cambiarEstadoCuadrilla(
                cdId, Map.of("estado", "ACTIVA", "frenteTrabajo", "Sector B Nivel +6.00")
        );
        assertEquals(HttpStatus.OK, respUpdate.getStatusCode());
        assertEquals("Sector B Nivel +6.00", respUpdate.getBody().getFrenteTrabajo());

        // 4. Aislamiento Cross-Tenant
        long tenantAjeno = 99988L;
        TenantContext.setCurrentTenant(tenantAjeno);

        // Listar cuadrillas de proyecto ajeno -> 404
        ResponseStatusException exListarAjeno = assertThrows(ResponseStatusException.class, () ->
                construccionController.listarCuadrillas(proyId)
        );
        assertEquals(HttpStatus.NOT_FOUND, exListarAjeno.getStatusCode());

        // Obtener cuadrilla ajena -> 404
        ResponseEntity<CuadrillaConstruccionEntity> respGetAjeno = construccionController.obtenerCuadrilla(cdId);
        assertEquals(HttpStatus.NOT_FOUND, respGetAjeno.getStatusCode());

        // Actualizar cuadrilla ajena -> 404
        ResponseStatusException exUpdateAjeno = assertThrows(ResponseStatusException.class, () ->
                construccionController.cambiarEstadoCuadrilla(cdId, Map.of("frenteTrabajo", "Frente Ilegal"))
        );
        assertEquals(HttpStatus.NOT_FOUND, exUpdateAjeno.getStatusCode());

        // Intentar registrar cuadrilla en proyecto propio pero asignandole una partida de otro tenant -> 400 BAD_REQUEST
        ProyectoConstruccionEntity proyAjeno = crearProyectoHelper(tenantAjeno, "PROY-OTRO", "Obra Propia Tenant 2");
        Long proyAjenoId = proyAjeno.getId();

        CuadrillaConstruccionEntity cdCrossPartida = new CuadrillaConstruccionEntity();
        cdCrossPartida.setCodigo("CD-CROSS-01");
        cdCrossPartida.setNombre("Cuadrilla Cross");
        cdCrossPartida.setFrenteTrabajo("Frente 1");
        cdCrossPartida.setCapatazResponsable("Capataz");
        cdCrossPartida.setFechaInicio(java.time.LocalDate.now());
        cdCrossPartida.setPartidaId(partId); // Partida de tenant1

        ResponseStatusException exCrossPart = assertThrows(ResponseStatusException.class, () ->
                construccionController.registrarCuadrilla(proyAjenoId, cdCrossPartida, "IK-CD-CROSS")
        );
        assertEquals(HttpStatus.BAD_REQUEST, exCrossPart.getStatusCode());
    }
}
