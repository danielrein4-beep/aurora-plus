package com.auroraplus.modules.tamanacocomercial.controllers;

import com.auroraplus.modules.tamanacocomercial.entities.DespachoComercial;
import com.auroraplus.modules.tamanacocomercial.entities.Gasto;
import com.auroraplus.modules.tamanacocomercial.entities.HistorialProveedor;
import com.auroraplus.modules.tamanacocomercial.entities.Mina;
import com.auroraplus.modules.tamanacocomercial.entities.Proveedor;
import com.auroraplus.modules.tamanacocomercial.repositories.DespachoComercialRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.GastoRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.HistorialProveedorRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.MinaRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.ProveedorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tamanaco-comercial/proveedores")
public class ProveedorController {

    @Autowired
    private ProveedorRepository proveedorRepository;

    @Autowired
    private HistorialProveedorRepository historialProveedorRepository;

    @Autowired
    private GastoRepository gastoRepository;

    @Autowired
    private DespachoComercialRepository despachoComercialRepository;

    @Autowired
    private MinaRepository minaRepository;

    @GetMapping
    public List<Proveedor> listarTodos() {
        return proveedorRepository.findAllByOrderByNombreAsc();
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestParam Long tenantId, @RequestBody Proveedor proveedor) {
        if (proveedor.getNombre() == null || proveedor.getNombre().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre del proveedor es obligatorio"));
        }

        proveedor.setTenantId(tenantId);
        Proveedor guardado = proveedorRepository.save(proveedor);

        HistorialProveedor eventoInicial = new HistorialProveedor();
        eventoInicial.setTenantId(tenantId);
        eventoInicial.setProveedorId(guardado.getId());
        eventoInicial.setTipoEvento("REGISTRO");
        eventoInicial.setDescripcion("Proveedor registrado en el sistema como " + guardado.getTipo());
        historialProveedorRepository.save(eventoInicial);

        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody Proveedor datos) {
        return proveedorRepository.findById(id)
            .map(p -> {
                p.setNombre(datos.getNombre());
                p.setTelefono(datos.getTelefono());
                p.setContacto(datos.getContacto());
                p.setTipo(datos.getTipo());
                p.setDireccion(datos.getDireccion());
                if (datos.getActivo() != null) p.setActivo(datos.getActivo());

                Proveedor actualizado = proveedorRepository.save(p);

                HistorialProveedor evento = new HistorialProveedor();
                evento.setTenantId(tenantId);
                evento.setProveedorId(actualizado.getId());
                evento.setTipoEvento("ACTUALIZACION");
                evento.setDescripcion("Datos de contacto y perfil del proveedor actualizados");
                historialProveedorRepository.save(evento);

                return ResponseEntity.ok(actualizado);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> desactivar(@PathVariable Long id, @RequestParam Long tenantId) {
        return proveedorRepository.findById(id)
            .map(p -> {
                p.setActivo(!Boolean.TRUE.equals(p.getActivo()));
                proveedorRepository.save(p);

                HistorialProveedor evento = new HistorialProveedor();
                evento.setTenantId(tenantId);
                evento.setProveedorId(p.getId());
                evento.setTipoEvento("ESTADO");
                evento.setDescripcion(p.getActivo() ? "Proveedor reactivado" : "Proveedor desactivado");
                historialProveedorRepository.save(evento);

                return ResponseEntity.ok(p);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/historial")
    public ResponseEntity<?> obtenerHistorialCompleto(@PathVariable Long id) {
        Optional<Proveedor> provOpt = proveedorRepository.findById(id);
        if (provOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Proveedor proveedor = provOpt.get();
        String nombre = proveedor.getNombre().trim();

        Optional<Mina> minaOpt = minaRepository.findByNombreIgnoreCase(nombre);
        BigDecimal tarifaCopPorTon = (minaOpt.isPresent() && minaOpt.get().getTarifaCopPorTon() != null)
                                 ? minaOpt.get().getTarifaCopPorTon() : BigDecimal.ZERO;

        List<HistorialProveedor> eventos = historialProveedorRepository.findByProveedorIdOrderByFechaDesc(id);

        List<DespachoComercial> despachosRaw = despachoComercialRepository.findAll().stream()
            .filter(d -> d.getMina() != null && d.getMina().trim().equalsIgnoreCase(nombre))
            .sorted(Comparator.comparing(DespachoComercial::getFechaDespacho, Comparator.nullsFirst(Comparator.reverseOrder())))
            .collect(Collectors.toList());

        BigDecimal totalToneladas = despachosRaw.stream()
            .map(d -> d.getPeso() != null ? d.getPeso() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalDevengadoCargasCop = totalToneladas.multiply(tarifaCopPorTon).setScale(2, RoundingMode.HALF_UP);

        List<Map<String, Object>> despachosDetalle = despachosRaw.stream().map(d -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", d.getId());
            item.put("fecha", d.getFechaDespacho());
            item.put("chofer", d.getChofer());
            item.put("placa", d.getPlaca());
            item.put("peso", d.getPeso());
            item.put("tarifa", tarifaCopPorTon);
            item.put("totalCop", (d.getPeso() != null ? d.getPeso() : BigDecimal.ZERO).multiply(tarifaCopPorTon));
            return item;
        }).collect(Collectors.toList());

        List<Gasto> todosGastos = gastoRepository.findAll();
        List<Gasto> gastosVinculados = todosGastos.stream()
            .filter(g -> (g.getMinaAsociada() != null && g.getMinaAsociada().trim().equalsIgnoreCase(nombre))
                      || (g.getDescripcion() != null && g.getDescripcion().toLowerCase().contains(nombre.toLowerCase())))
            .sorted(Comparator.comparing(Gasto::getFecha, Comparator.reverseOrder()))
            .collect(Collectors.toList());

        BigDecimal totalPagosRealizadosCop = sumaPorMonedaExcluyendoPrestamo(gastosVinculados, "COP");
        BigDecimal totalPagosRealizadosUsd = sumaPorMonedaExcluyendoPrestamo(gastosVinculados, "USD");
        BigDecimal totalPagosRealizadosVes = sumaPorMonedaExcluyendoPrestamo(gastosVinculados, "VES");

        BigDecimal totalPrestamosPendientesCop = gastosVinculados.stream()
            .filter(g -> "Préstamo".equalsIgnoreCase(g.getCategoria()) && !Boolean.TRUE.equals(g.getDescontado()) && "COP".equalsIgnoreCase(g.getMoneda()))
            .map(g -> g.getMonto() != null ? g.getMonto() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal saldoPendienteCop = totalDevengadoCargasCop.subtract(totalPagosRealizadosCop).subtract(totalPrestamosPendientesCop).max(BigDecimal.ZERO);

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("proveedor", proveedor);
        respuesta.put("tarifaCopPorTon", tarifaCopPorTon);
        respuesta.put("totalDespachos", despachosRaw.size());
        respuesta.put("totalToneladas", totalToneladas.setScale(2, RoundingMode.HALF_UP));
        respuesta.put("totalDevengadoCargasCop", totalDevengadoCargasCop);
        respuesta.put("totalPagosRealizadosCop", totalPagosRealizadosCop.setScale(2, RoundingMode.HALF_UP));
        respuesta.put("totalPagosRealizadosUsd", totalPagosRealizadosUsd.setScale(2, RoundingMode.HALF_UP));
        respuesta.put("totalPagosRealizadosVes", totalPagosRealizadosVes.setScale(2, RoundingMode.HALF_UP));
        respuesta.put("totalPrestamosPendientesCop", totalPrestamosPendientesCop.setScale(2, RoundingMode.HALF_UP));
        respuesta.put("saldoPendienteCop", saldoPendienteCop.setScale(2, RoundingMode.HALF_UP));
        respuesta.put("despachos", despachosDetalle);
        respuesta.put("gastos", gastosVinculados);
        respuesta.put("eventos", eventos);

        return ResponseEntity.ok(respuesta);
    }

    private BigDecimal sumaPorMonedaExcluyendoPrestamo(List<Gasto> gastos, String moneda) {
        return gastos.stream()
            .filter(g -> !"Préstamo".equalsIgnoreCase(g.getCategoria()) && moneda.equalsIgnoreCase(g.getMoneda()))
            .map(g -> g.getMonto() != null ? g.getMonto() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @PostMapping("/{id}/nota")
    public ResponseEntity<?> agregarNota(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody Map<String, String> payload) {
        String texto = payload.get("nota");
        if (texto == null || texto.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "La nota no puede estar vacía"));
        }
        if (!proveedorRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        HistorialProveedor nota = new HistorialProveedor();
        nota.setTenantId(tenantId);
        nota.setProveedorId(id);
        nota.setTipoEvento("NOTA");
        nota.setDescripcion(texto.trim());
        HistorialProveedor guardada = historialProveedorRepository.save(nota);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardada);
    }
}
