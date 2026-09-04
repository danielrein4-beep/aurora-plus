package com.auroraplus.modules.tamanacocomercial.controllers;

import com.auroraplus.modules.tamanacocomercial.entities.Empleado;
import com.auroraplus.modules.tamanacocomercial.entities.Gasto;
import com.auroraplus.modules.tamanacocomercial.repositories.EmpleadoRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.GastoRepository;
import com.auroraplus.modules.tamanacocomercial.services.AuditoriaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tamanaco-comercial/empleados")
public class EmpleadoController {

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @Autowired
    private GastoRepository gastoRepository;

    @Autowired
    private AuditoriaService auditoriaService;

    @GetMapping
    public List<Empleado> listarTodos() {
        List<Empleado> empleados = empleadoRepository.findAllByOrderByNombreAsc();
        asignarUltimoGasto(empleados);
        return empleados;
    }

    @GetMapping("/activos")
    public List<Empleado> listarActivos() {
        List<Empleado> empleados = empleadoRepository.findByActivoTrueOrderByNombreAsc();
        asignarUltimoGasto(empleados);
        return empleados;
    }

    private void asignarUltimoGasto(List<Empleado> empleados) {
        List<Gasto> gastos = gastoRepository.findAllByOrderByIdDesc();
        for (Empleado emp : empleados) {
            String empToken = "| Empleado: " + emp.getNombre();
            for (Gasto g : gastos) {
                if ("Nómina Operativa".equalsIgnoreCase(g.getCategoria()) && g.getDescripcion() != null && g.getDescripcion().contains(empToken)) {
                    emp.setUltimoGastoId(g.getId());
                    emp.setReciboUrl(g.getReciboUrl());
                    break;
                }
            }
        }
    }

    @PostMapping
    public Empleado crear(@RequestParam Long tenantId, @RequestBody Empleado empleado) {
        empleado.setTenantId(tenantId);
        if (empleado.getActivo() == null) empleado.setActivo(true);
        Empleado guardado = empleadoRepository.save(empleado);
        auditoriaService.registrar(tenantId, "CREAR", "EMPLEADOS", "Registró al empleado: " + guardado.getNombre());
        return guardado;
    }

    @PutMapping("/{id}")
    public Empleado actualizar(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody Empleado detalles) {
        Empleado emp = empleadoRepository.findById(id).orElseThrow();
        emp.setNombre(detalles.getNombre());
        emp.setCedula(detalles.getCedula());
        emp.setCargo(detalles.getCargo());
        emp.setSalarioBase(detalles.getSalarioBase());
        emp.setMoneda(detalles.getMoneda());
        emp.setFrecuenciaPago(detalles.getFrecuenciaPago());
        emp.setActivo(detalles.getActivo());

        Empleado actualizado = empleadoRepository.save(emp);
        auditoriaService.registrar(tenantId, "EDITAR", "EMPLEADOS", "Actualizó al empleado: " + actualizado.getNombre());
        return actualizado;
    }

    @PostMapping("/{id}/pagar")
    public Gasto pagarNomina(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody Map<String, Object> payload) {
        Empleado emp = empleadoRepository.findById(id).orElseThrow();

        BigDecimal monto = new BigDecimal(payload.get("monto").toString());
        String fecha = payload.get("fecha").toString();
        String concepto = payload.get("concepto").toString();
        String metodoPago = payload.get("metodoPago") != null ? payload.get("metodoPago").toString() : "Efectivo";
        String referencia = payload.get("referencia") != null ? payload.get("referencia").toString() : "";

        Gasto gasto = new Gasto();
        gasto.setTenantId(tenantId);
        gasto.setFecha(LocalDate.parse(fecha.split(" ")[0]));
        gasto.setCategoria("Nómina Operativa");

        String descFinal = concepto + " | Empleado: " + emp.getNombre();
        if (!referencia.isEmpty()) descFinal += " | Ref: " + referencia;
        gasto.setDescripcion(descFinal);

        gasto.setMonto(monto);
        gasto.setMoneda(emp.getMoneda());
        gasto.setMinaAsociada("Personal Interno");
        gasto.setMetodoPago(metodoPago);
        gasto.recalcularMontoUsd();

        Gasto guardado = gastoRepository.save(gasto);
        auditoriaService.registrar(tenantId, "CREAR", "EMPLEADOS", "Registró pago de nómina para: " + emp.getNombre() + " por " + monto + " " + emp.getMoneda());

        return guardado;
    }
}
