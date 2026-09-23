package com.auroraplus.modules.comercio;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.modules.comercio.controllers.CatalogoPublicoController;
import com.auroraplus.modules.repuestos.entities.RepuestoItem;
import com.auroraplus.modules.repuestos.repositories.RepuestoItemRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * El catálogo público antes no dejaba organizar nada: sin categoría editable, sin forma
 * de ocultar un producto y sin control de orden (ver Onboarding/ComercioApp — Comercio
 * cubre rubros tan distintos como celulares, perfumes, zapatos y ferretería en el mismo
 * catálogo). Estos tests fijan que /api/public/catalogo respeta `visible`, ordena por
 * `ordenVisualizacion` y expone la categoría real del dueño en vez de una inventada.
 */
@SpringBootTest
@ActiveProfiles("test")
class CatalogoPublicoOrdenVisibilidadTest {

    @Autowired private CatalogoPublicoController catalogoPublicoController;
    @Autowired private LicenciaTenantRepository licenciaTenantRepository;
    @Autowired private RepuestoItemRepository repuestoItemRepository;

    private LicenciaTenant crearLicencia(Long tenantId, String slug) {
        LicenciaTenant l = new LicenciaTenant();
        l.setTenantId(tenantId);
        l.setNombreEmpresa("Negocio de Prueba " + tenantId);
        l.setModuloPrincipal("repuestos");
        l.setSlugCatalogo(slug);
        l.setTipoLicencia(LicenciaTenant.TipoLicencia.COMERCIAL);
        l.setActiva(true);
        l.setFechaVencimientoPago(LocalDate.now().plusYears(1));
        return licenciaTenantRepository.save(l);
    }

    private RepuestoItem crearItem(Long tenantId, String sku, String categoria, boolean visible, int orden) {
        RepuestoItem r = new RepuestoItem();
        r.setTenantId(tenantId);
        r.setCodigoSku(sku);
        r.setDescripcion("Producto " + sku);
        r.setPrecioVenta(new BigDecimal("10.00"));
        r.setCategoria(categoria);
        r.setVisible(visible);
        r.setOrdenVisualizacion(orden);
        return repuestoItemRepository.save(r);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> productosDe(String slug) {
        ResponseEntity<?> resp = catalogoPublicoController.obtenerCatalogoPublico(slug);
        Map<String, Object> body = (Map<String, Object>) resp.getBody();
        return (List<Map<String, Object>>) body.get("productos");
    }

    @Test
    void unProductoOcultoNoApareceEnElCatalogoPublico() {
        long tenantId = 959101L;
        crearLicencia(tenantId, "negocio-959101");
        crearItem(tenantId, "SKU-959101-A", "Zapatos", true, 0);
        crearItem(tenantId, "SKU-959101-B", "Zapatos", false, 0); // oculto

        List<Map<String, Object>> productos = productosDe("negocio-959101");

        assertEquals(1, productos.size());
        assertEquals("SKU-959101-A", productos.get(0).get("codigo"));
    }

    @Test
    void elOrdenVisualizacionDeterminaElOrdenDeAparicion() {
        long tenantId = 959102L;
        crearLicencia(tenantId, "negocio-959102");
        crearItem(tenantId, "SKU-959102-ULTIMO", "Perfumes", true, 10);
        crearItem(tenantId, "SKU-959102-PRIMERO", "Perfumes", true, 1);
        crearItem(tenantId, "SKU-959102-MEDIO", "Perfumes", true, 5);

        List<Map<String, Object>> productos = productosDe("negocio-959102");

        assertEquals(3, productos.size());
        assertEquals("SKU-959102-PRIMERO", productos.get(0).get("codigo"));
        assertEquals("SKU-959102-MEDIO", productos.get(1).get("codigo"));
        assertEquals("SKU-959102-ULTIMO", productos.get(2).get("codigo"));
    }

    @Test
    void exponeLaCategoriaRealDelDuenoNoUnaInventada() {
        long tenantId = 959103L;
        crearLicencia(tenantId, "negocio-959103");
        crearItem(tenantId, "SKU-959103", "Celulares y Accesorios", true, 0);

        List<Map<String, Object>> productos = productosDe("negocio-959103");

        assertEquals("Celulares y Accesorios", productos.get(0).get("categoria"));
    }

    @Test
    void sinCategoriaAsignadaCaeEnGeneralNoEnUnaInventada() {
        long tenantId = 959104L;
        crearLicencia(tenantId, "negocio-959104");
        crearItem(tenantId, "SKU-959104", null, true, 0);

        List<Map<String, Object>> productos = productosDe("negocio-959104");

        assertEquals("General", productos.get(0).get("categoria"));
    }
}
