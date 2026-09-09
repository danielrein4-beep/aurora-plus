package com.auroraplus.modules.horeca.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.horeca.entities.DetalleReceta;
import com.auroraplus.modules.horeca.entities.EscandalloReceta;
import com.auroraplus.modules.horeca.repositories.DetalleRecetaRepository;
import com.auroraplus.modules.horeca.repositories.EscandalloRecetaRepository;
import com.auroraplus.modules.horeca.services.EscandalloService;
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

    // Hallazgo de seguridad corregido: en vez de depender del filtro de
    // Hibernate del TenantInterceptor (no siempre "vivo" en la sesión que
    // ejecuta el findAll(), ver MesaController), se pide el tenant explícito
    // al repositorio.
    @GetMapping
    public List<EscandalloReceta> listar() {
        return escandalloRecetaRepository.findByTenantId(TenantContext.getCurrentTenant());
    }

    @GetMapping("/{id}")
    public EscandalloReceta obtener(@PathVariable Long id, @RequestParam Long tenantId) {
        EscandalloReceta escandallo = escandalloRecetaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Escandallo no encontrado"));
        if (!escandallo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Escandallo no pertenece a este tenant");
        }
        return escandallo;
    }

    public static class CrearEscandalloRequest {
        public String nombrePlato;
        public String estacionCocina;
        public BigDecimal precioVenta;
        public Boolean requiereCocina;
    }

    @PostMapping
    public ResponseEntity<EscandalloReceta> crear(@RequestParam Long tenantId, @RequestBody CrearEscandalloRequest request) {
        EscandalloReceta escandallo = new EscandalloReceta();
        escandallo.setTenantId(tenantId);
        escandallo.setNombrePlato(request.nombrePlato);
        escandallo.setEstacionCocina(request.estacionCocina != null ? request.estacionCocina : "COCINA");
        escandallo.setPrecioVenta(request.precioVenta);
        escandallo.setCostoTotalProduccion(BigDecimal.ZERO);
        escandallo.setRequiereCocina(request.requiereCocina == null || request.requiereCocina);
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

    // CRÍTICO (fuga entre tenants, hallada en producción): faltaba tenantId y
    // la validación de que la receta sea de este tenant — cualquier cuenta
    // podía leer el escandallo/costeo de CUALQUIER otro tenant adivinando el id.
    @GetMapping("/{id}/ingredientes")
    public List<DetalleReceta> listarIngredientes(@PathVariable Long id, @RequestParam Long tenantId) {
        EscandalloReceta escandallo = escandalloRecetaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Escandallo no encontrado"));
        if (!escandallo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Escandallo no pertenece a este tenant");
        }
        return detalleRecetaRepository.findByEscandalloId(id);
    }

    @PostMapping("/{id}/recalcular-costo")
    public ResponseEntity<EscandalloReceta> recalcularCosto(@PathVariable Long id, @RequestParam Long tenantId) {
        return ResponseEntity.ok(escandalloService.recalcularCosto(id, tenantId));
    }

    /**
     * Elimina una receta y sus líneas de ingredientes (ej. datos de prueba).
     * Si ya se vendió alguna vez o se usa como sub-receta de otra, la base de
     * datos rechaza el borrado por la referencia (FK) — en ese caso no se
     * revienta con un 500: se la marca inactiva automáticamente (desaparece
     * del catálogo de Venta Rápida igual, sin perder el historial de ventas)
     * y se avisa que quedó oculta en vez de borrada.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<EscandalloReceta> eliminar(@PathVariable Long id, @RequestParam Long tenantId) {
        EscandalloReceta escandallo = escandalloRecetaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Escandallo no encontrado"));
        if (!escandallo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Escandallo no pertenece a este tenant");
        }

        detalleRecetaRepository.deleteAll(detalleRecetaRepository.findByEscandalloId(id));

        try {
            escandalloRecetaRepository.delete(escandallo);
            escandalloRecetaRepository.flush();
            return ResponseEntity.noContent().build();
        } catch (DataIntegrityViolationException e) {
            escandallo.setActivo(false);
            escandalloRecetaRepository.save(escandallo);
            return ResponseEntity.ok(escandallo);
        }
    }

    /** Muestra/oculta la receta del catálogo de Venta Rápida sin borrarla (para recetas que ya tienen ventas y no se pueden eliminar). */
    @PatchMapping("/{id}/activo")
    public ResponseEntity<EscandalloReceta> cambiarActivo(@PathVariable Long id, @RequestParam Long tenantId, @RequestParam boolean activo) {
        EscandalloReceta escandallo = escandalloRecetaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Escandallo no encontrado"));
        if (!escandallo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Escandallo no pertenece a este tenant");
        }
        escandallo.setActivo(activo);
        return ResponseEntity.ok(escandalloRecetaRepository.save(escandallo));
    }

    /** Define si este producto pasa por el tablero de cocina (KDS) o se entrega de una vez (bebida embotellada, snack, combo sin cocción). */
    @PatchMapping("/{id}/requiere-cocina")
    public ResponseEntity<EscandalloReceta> cambiarRequiereCocina(@PathVariable Long id, @RequestParam Long tenantId, @RequestParam boolean requiereCocina) {
        EscandalloReceta escandallo = escandalloRecetaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Escandallo no encontrado"));
        if (!escandallo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Escandallo no pertenece a este tenant");
        }
        escandallo.setRequiereCocina(requiereCocina);
        return ResponseEntity.ok(escandalloRecetaRepository.save(escandallo));
    }
}
