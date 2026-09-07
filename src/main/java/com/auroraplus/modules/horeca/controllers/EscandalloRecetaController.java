package com.auroraplus.modules.horeca.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.horeca.entities.DetalleReceta;
import com.auroraplus.modules.horeca.entities.EscandalloReceta;
import com.auroraplus.modules.horeca.repositories.DetalleRecetaRepository;
import com.auroraplus.modules.horeca.repositories.EscandalloRecetaRepository;
import com.auroraplus.modules.horeca.services.EscandalloService;
import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/** CRUD de recetas/escandallos e ingredientes — no existía ningún endpoint para esto antes (solo se creaban por seed interno). */
@RestController
@RequestMapping("/api/horeca/escandallos")
public class EscandalloRecetaController {

    @Autowired
    private EscandalloRecetaRepository escandalloRecetaRepository;

    @Autowired
    private DetalleRecetaRepository detalleRecetaRepository;

    @Autowired
    private EscandalloService escandalloService;

    @Autowired
    private EntityManager entityManager;

    // Mismo hallazgo de seguridad que ArticuloController/MesaController: sin
    // esto, findAll() devuelve recetas de todos los tenants mezcladas.
    @GetMapping
    public List<EscandalloReceta> listar() {
        entityManager.unwrap(Session.class).enableFilter("tenantFilter")
            .setParameter("tenantId", TenantContext.getCurrentTenant());
        return escandalloRecetaRepository.findAll();
    }

    @GetMapping("/{id}")
    public EscandalloReceta obtener(@PathVariable Long id) {
        return escandalloRecetaRepository.findById(id).orElseThrow(() -> new RuntimeException("Escandallo no encontrado"));
    }

    public static class CrearEscandalloRequest {
        public String nombrePlato;
        public String estacionCocina;
        public BigDecimal precioVenta;
    }

    @PostMapping
    public ResponseEntity<EscandalloReceta> crear(@RequestParam Long tenantId, @RequestBody CrearEscandalloRequest request) {
        EscandalloReceta escandallo = new EscandalloReceta();
        escandallo.setTenantId(tenantId);
        escandallo.setNombrePlato(request.nombrePlato);
        escandallo.setEstacionCocina(request.estacionCocina != null ? request.estacionCocina : "COCINA");
        escandallo.setPrecioVenta(request.precioVenta);
        escandallo.setCostoTotalProduccion(BigDecimal.ZERO);
        return ResponseEntity.ok(escandalloRecetaRepository.save(escandallo));
    }

    public static class IngredienteRequest {
        public String ingredienteSku; // exactamente uno de ingredienteSku o subEscandalloId
        public Long subEscandalloId;
        public BigDecimal cantidadRequerida; // ignorado si se informan pesoNeto+porcentajeMerma
        public BigDecimal pesoNeto;
        public BigDecimal porcentajeMerma;
    }

    /** Agrega una línea de ingrediente directo o sub-receta. Exactamente uno de ingredienteSku/subEscandalloId. */
    @PostMapping("/{id}/ingredientes")
    public ResponseEntity<EscandalloReceta> agregarIngrediente(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody IngredienteRequest request) {
        EscandalloReceta escandallo = escandalloRecetaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Escandallo no encontrado"));
        if (!escandallo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Escandallo no pertenece a este tenant");
        }

        boolean tieneIngrediente = request.ingredienteSku != null && !request.ingredienteSku.isBlank();
        boolean tieneSubReceta = request.subEscandalloId != null;
        if (tieneIngrediente == tieneSubReceta) {
            throw new RuntimeException("Debe indicar exactamente uno: ingredienteSku (artículo directo) o subEscandalloId (sub-receta)");
        }

        DetalleReceta detalle = new DetalleReceta();
        detalle.setTenantId(tenantId);
        detalle.setEscandallo(escandallo);

        if (tieneSubReceta) {
            if (request.subEscandalloId.equals(id)) {
                throw new RuntimeException("Una receta no puede usarse a sí misma como sub-receta");
            }
            EscandalloReceta subReceta = escandalloRecetaRepository.findById(request.subEscandalloId)
                .orElseThrow(() -> new RuntimeException("Sub-receta no encontrada: " + request.subEscandalloId));
            if (!subReceta.getTenantId().equals(tenantId)) {
                throw new RuntimeException("Violación de seguridad: Sub-receta no pertenece a este tenant");
            }
            detalle.setSubReceta(subReceta);
            detalle.setCantidadRequerida(request.cantidadRequerida);
        } else {
            detalle.setIngredienteSku(request.ingredienteSku);
            BigDecimal cantidadBruta = escandalloService.calcularCantidadBruta(request.pesoNeto, request.porcentajeMerma);
            detalle.setPesoNeto(request.pesoNeto);
            detalle.setPorcentajeMerma(request.porcentajeMerma);
            detalle.setCantidadRequerida(cantidadBruta != null ? cantidadBruta : request.cantidadRequerida);
        }

        if (detalle.getCantidadRequerida() == null || detalle.getCantidadRequerida().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("La cantidad requerida debe ser mayor a cero (indíquela directo, o vía pesoNeto+porcentajeMerma)");
        }

        detalleRecetaRepository.save(detalle);

        return ResponseEntity.ok(escandalloService.recalcularCosto(id, tenantId));
    }

    @GetMapping("/{id}/ingredientes")
    public List<DetalleReceta> listarIngredientes(@PathVariable Long id) {
        return detalleRecetaRepository.findByEscandalloId(id);
    }

    @PostMapping("/{id}/recalcular-costo")
    public ResponseEntity<EscandalloReceta> recalcularCosto(@PathVariable Long id, @RequestParam Long tenantId) {
        return ResponseEntity.ok(escandalloService.recalcularCosto(id, tenantId));
    }

    /**
     * Elimina una receta y sus líneas de ingredientes (ej. datos de prueba).
     * Si ya se vendió alguna vez o se usa como sub-receta de otra, la base de
     * datos rechaza el borrado por la referencia (FK) — se traduce a un error
     * claro en vez de un 500 crudo.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id, @RequestParam Long tenantId) {
        EscandalloReceta escandallo = escandalloRecetaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Escandallo no encontrado"));
        if (!escandallo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Escandallo no pertenece a este tenant");
        }

        detalleRecetaRepository.deleteAll(detalleRecetaRepository.findByEscandalloId(id));

        try {
            escandalloRecetaRepository.delete(escandallo);
            escandalloRecetaRepository.flush();
        } catch (DataIntegrityViolationException e) {
            throw new RuntimeException("No se puede eliminar \"" + escandallo.getNombrePlato()
                + "\": ya tiene ventas registradas o se usa como sub-receta de otro plato.");
        }

        return ResponseEntity.noContent().build();
    }
}
