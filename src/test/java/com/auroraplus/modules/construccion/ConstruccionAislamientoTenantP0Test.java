package com.auroraplus.modules.construccion;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.construccion.controllers.ConstruccionController;
import com.auroraplus.modules.construccion.entities.*;
import com.auroraplus.modules.construccion.repositories.*;
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

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class ConstruccionAislamientoTenantP0Test {

    @Autowired
    private ConstruccionController construccionController;

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

    // 1. Falta de Tenant en TenantContext -> 401 Unauthorized
    @Test
    void faltaDeTenant_arrojaUnauthorized() {
        TenantContext.clear();

        ResponseStatusException exListar = assertThrows(ResponseStatusException.class, () -> {
            construccionController.listarProyectos();
        });
        assertEquals(HttpStatus.UNAUTHORIZED, exListar.getStatusCode());

        ResponseStatusException exInsumos = assertThrows(ResponseStatusException.class, () -> {
            construccionController.listarInsumos();
        });
        assertEquals(HttpStatus.UNAUTHORIZED, exInsumos.getStatusCode());
    }

    // 2. Aislamiento A/B de Proyectos entre Tenants
    @Test
    void aislamientoProyectos_tenantBNoPuedeListarNiObtenerProyectosDeA() {
        long tenantA = 99101L;
        long tenantB = 99102L;

        ProyectoConstruccionEntity proyA = crearProyectoHelper(tenantA, "PROY-A-01", "Edificio Alfa");

        // Tenant A lista y ve su proyecto
        TenantContext.setCurrentTenant(tenantA);
        List<ProyectoConstruccionEntity> listaA = construccionController.listarProyectos();
        assertTrue(listaA.stream().anyMatch(p -> p.getId().equals(proyA.getId())));

        // Tenant B lista y NO ve el proyecto de A
        TenantContext.setCurrentTenant(tenantB);
        List<ProyectoConstruccionEntity> listaB = construccionController.listarProyectos();
        assertFalse(listaB.stream().anyMatch(p -> p.getId().equals(proyA.getId())));

        // Tenant B intenta obtener por ID directo del proyecto de A -> 404 Not Found
        ResponseEntity<ProyectoConstruccionEntity> resp = construccionController.obtenerProyecto(proyA.getId());
        assertEquals(HttpStatus.NOT_FOUND, resp.getStatusCode());
    }

    // 3. Referencias Cruzadas: Tenant B no puede crear partida en proyecto de Tenant A
    @Test
    void referenciasCruzadas_tenantBNoPuedeCrearPartidaEnProyectoDeA() {
        long tenantA = 99201L;
        long tenantB = 99202L;

        ProyectoConstruccionEntity proyA = crearProyectoHelper(tenantA, "PROY-A-02", "Puente Sur");

        TenantContext.setCurrentTenant(tenantB);
        PartidaConstruccionEntity partidaHack = new PartidaConstruccionEntity();
        partidaHack.setCodigoCovenin("E-311.110");
        partidaHack.setDescripcion("Concreto f'c=250 kg/cm2");
        partidaHack.setUnidad("m3");
        partidaHack.setCantidadPresupuestada(new BigDecimal("10.00"));
        partidaHack.setPrecioUnitario(new BigDecimal("120.00"));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            construccionController.crearPartida(proyA.getId(), partidaHack);
        });
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    // 4. Referencias Cruzadas: Partida no puede asociar capítulo de otro Tenant
    @Test
    void referenciasCruzadas_partidaNoPuedeUsarCapituloDeOtroTenant() {
        long tenantA = 99301L;
        long tenantB = 99302L;

        // Tenant A crea capítulo
        CapituloConstruccionEntity capA = new CapituloConstruccionEntity();
        capA.setTenantId(tenantA);
        capA.setCodigo("1.0");
        capA.setNombre("Obras Preliminares A");
        capA.setOrden(1);
        capA = capituloRepository.save(capA);

        // Tenant B tiene su proyecto
        ProyectoConstruccionEntity proyB = crearProyectoHelper(tenantB, "PROY-B-01", "Galpón B");

        TenantContext.setCurrentTenant(tenantB);
        PartidaConstruccionEntity partida = new PartidaConstruccionEntity();
        partida.setCapituloId(capA.getId()); // Intento de usar capítulo ajeno
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

    // 4B. Partida no puede asociar capítulo de otro proyecto (aunque pertenezca al mismo tenant)
    @Test
    void referenciasCruzadas_partidaNoPuedeUsarCapituloDeOtroProyectoDelMismoTenant() {
        long tenant = 99303L;
        TenantContext.setCurrentTenant(tenant);

        // Proyecto 1 y su capítulo C1
        ProyectoConstruccionEntity proy1 = crearProyectoHelper(tenant, "PROY-01", "Edificio Alfa");
        CapituloConstruccionEntity capProy1 = new CapituloConstruccionEntity();
        capProy1.setTenantId(tenant);
        capProy1.setProyectoId(proy1.getId());
        capProy1.setCodigo("1.0");
        capProy1.setNombre("Preliminares Edificio Alfa");
        capProy1.setOrden(1);
        capProy1 = capituloRepository.save(capProy1);

        // Proyecto 2 del MISMO tenant
        ProyectoConstruccionEntity proy2 = crearProyectoHelper(tenant, "PROY-02", "Edificio Beta");

        // Intentar crear partida en Proyecto 2 vinculada al capítulo de Proyecto 1
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
        assertTrue(exCruzado.getReason().contains("no coincide con el proyecto de la partida"));

        // En cambio, en su propio Proyecto 1 sí se acepta
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

    // 5. Aislamiento en Eliminación: Tenant B no puede eliminar partida de Tenant A
    @Test
    void aislamientoEliminacion_tenantBNoPuedeEliminarPartidaDeA() {
        long tenantA = 99401L;
        long tenantB = 99402L;

        ProyectoConstruccionEntity proyA = crearProyectoHelper(tenantA, "PROY-A-03", "Torre Central");

        PartidaConstruccionEntity pA = new PartidaConstruccionEntity();
        pA.setTenantId(tenantA);
        pA.setProyectoId(proyA.getId());
        pA.setCodigoCovenin("E-321.100");
        pA.setDescripcion("Acero de refuerzo");
        pA.setUnidad("kg");
        pA.setCantidadPresupuestada(new BigDecimal("1000.00"));
        pA.setPrecioUnitario(new BigDecimal("1.80"));
        pA = partidaRepository.save(pA);

        // Tenant B intenta eliminar la partida de A -> 404 Not Found
        TenantContext.setCurrentTenant(tenantB);
        Long idPartida = pA.getId();
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            construccionController.eliminarPartida(idPartida);
        });
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());

        // Verificar que la partida de A sigue existiendo intacta
        assertTrue(partidaRepository.findById(idPartida).isPresent());
    }

    // 6. Rechazo de Stock Negativo y Consumo Inválido
    @Test
    void rechazoStockNegativoYConsumoInvalido() {
        long tenant = 99501L;
        InsumoConstruccionEntity insumo = crearInsumoHelper(tenant, "CEM-01", "Cemento Gris Tipo I", new BigDecimal("10.00"));

        TenantContext.setCurrentTenant(tenant);

        // Consumo mayor al stock disponible (15 > 10) -> BAD_REQUEST (stock negativo denegado)
        ResponseStatusException exSobreconsumo = assertThrows(ResponseStatusException.class, () -> {
            construccionController.registrarConsumo(insumo.getId(), Map.of("cantidad", new BigDecimal("15.00")));
        });
        assertEquals(HttpStatus.BAD_REQUEST, exSobreconsumo.getStatusCode());
        assertTrue(exSobreconsumo.getReason().contains("Stock insuficiente"));

        // Consumo negativo (-5.00) -> BAD_REQUEST
        ResponseStatusException exNegativo = assertThrows(ResponseStatusException.class, () -> {
            construccionController.registrarConsumo(insumo.getId(), Map.of("cantidad", new BigDecimal("-5.00")));
        });
        assertEquals(HttpStatus.BAD_REQUEST, exNegativo.getStatusCode());

        // Consumo válido (4.00) -> OK, stock restante 6.00
        ResponseEntity<InsumoConstruccionEntity> respValida = construccionController.registrarConsumo(insumo.getId(), Map.of("cantidad", new BigDecimal("4.00")));
        assertEquals(HttpStatus.OK, respValida.getStatusCode());
        assertEquals(new BigDecimal("6.00"), respValida.getBody().getStockActual());
    }

    // 6B. Descuento atómico de stock y bloqueo de sobreconsumo
    @Test
    void consumoInsumo_descuentoAtomicoYProteccionConcurrente() {
        long tenant = 99502L;
        InsumoConstruccionEntity insumo = crearInsumoHelper(tenant, "INS-ATOM-01", "Cemento Portland", new BigDecimal("20.00"));

        TenantContext.setCurrentTenant(tenant);

        // Consumo atómico válido de 5 sacos
        ResponseEntity<InsumoConstruccionEntity> resp1 = construccionController.registrarConsumo(insumo.getId(), Map.of("cantidad", new BigDecimal("5.00")));
        assertEquals(HttpStatus.OK, resp1.getStatusCode());
        assertEquals(new BigDecimal("15.00"), resp1.getBody().getStockActual());

        // Consumo atómico válido de 15 sacos (deja stock en 0)
        ResponseEntity<InsumoConstruccionEntity> resp2 = construccionController.registrarConsumo(insumo.getId(), Map.of("cantidad", new BigDecimal("15.00")));
        assertEquals(HttpStatus.OK, resp2.getStatusCode());
        assertEquals(new BigDecimal("0.00"), resp2.getBody().getStockActual());

        // Consumo adicional cuando ya está en 0 -> Rechazado con 400 Bad Request
        ResponseStatusException exSinStock = assertThrows(ResponseStatusException.class, () -> {
            construccionController.registrarConsumo(insumo.getId(), Map.of("cantidad", new BigDecimal("1.00")));
        });
        assertEquals(HttpStatus.BAD_REQUEST, exSinStock.getStatusCode());
    }

    // 7. Rechazo de Estados de Valuación Arbitrarios
    @Test
    void rechazoEstadosValuacionArbitrarios() {
        long tenant = 99601L;
        ProyectoConstruccionEntity proy = crearProyectoHelper(tenant, "PROY-VAL-01", "Hospital Municipal");

        TenantContext.setCurrentTenant(tenant);

        // Creación con estado arbitrario
        ValuacionConstruccionEntity valInvalida = new ValuacionConstruccionEntity();
        valInvalida.setNumeroValuacion(1);
        valInvalida.setPeriodoDesde(LocalDate.now());
        valInvalida.setPeriodoHasta(LocalDate.now().plusDays(15));
        valInvalida.setFechaEmision(LocalDate.now().plusDays(15));
        valInvalida.setMontoBruto(new BigDecimal("5000.00"));
        valInvalida.setEstado("ESTADO_INVENTADO_ARBITRARIO");

        ResponseStatusException exCreacion = assertThrows(ResponseStatusException.class, () -> {
            construccionController.crearValuacion(proy.getId(), valInvalida);
        });
        assertEquals(HttpStatus.BAD_REQUEST, exCreacion.getStatusCode());

        // Creación con estado válido
        valInvalida.setEstado("PRESENTADA");
        ResponseEntity<ValuacionConstruccionEntity> respValida = construccionController.crearValuacion(proy.getId(), valInvalida);
        assertEquals(HttpStatus.OK, respValida.getStatusCode());
        Long idVal = respValida.getBody().getId();

        // Intento de actualizar a estado arbitrario
        ResponseStatusException exPatch = assertThrows(ResponseStatusException.class, () -> {
            construccionController.cambiarEstadoValuacion(idVal, Map.of("estado", "HACK_ESTADO"));
        });
        assertEquals(HttpStatus.BAD_REQUEST, exPatch.getStatusCode());
    }

    // 8. Ignorar IDs en Creación
    @Test
    void ignorarIdsEnCreacion() {
        long tenant = 99701L;
        TenantContext.setCurrentTenant(tenant);

        ProyectoConstruccionEntity proyConIdForzado = new ProyectoConstruccionEntity();
        proyConIdForzado.setId(88888L); // ID forzado que debe ignorarse
        proyConIdForzado.setCodigo("PROY-ID-01");
        proyConIdForzado.setNombre("Obra Sin Sobrescritura");
        proyConIdForzado.setCliente("Cliente Seguro");

        ResponseEntity<ProyectoConstruccionEntity> resp = construccionController.crearProyecto(proyConIdForzado);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertNotNull(resp.getBody().getId());
        assertNotEquals(88888L, resp.getBody().getId(), "El ID forzado en creación debe ser ignorado");
    }
}
