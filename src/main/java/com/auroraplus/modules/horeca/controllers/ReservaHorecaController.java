package com.auroraplus.modules.horeca.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.horeca.entities.ReservaHoreca;
import com.auroraplus.modules.horeca.repositories.ReservaHorecaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Reservas de mesa — sin restricción de rol a propósito: es una tarea
 * operativa normal (agendar una llamada), no sensible como anular o
 * gestionar precios/proveedores.
 */
@RestController
@RequestMapping("/api/horeca/reservas")
public class ReservaHorecaController {

    @Autowired
    private ReservaHorecaRepository reservaHorecaRepository;

    // Por defecto trae las reservas del día indicado (o de hoy) — evita
    // cargar el histórico completo cada vez que se abre la pantalla.
    @GetMapping
    public List<ReservaHoreca> listarPorDia(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        LocalDate dia = fecha != null ? fecha : LocalDate.now();
        return reservaHorecaRepository.findByTenantIdAndFechaHoraBetweenOrderByFechaHoraAsc(
            TenantContext.getCurrentTenant(), dia.atStartOfDay(), dia.atTime(23, 59, 59));
    }

    public static class ReservaRequest {
        public String nombreCliente;
        public String telefono;
        public LocalDateTime fechaHora;
        public Integer numeroPersonas;
        public Integer numeroMesaSugerida;
        public String notas;
    }

    private void validar(ReservaRequest r) {
        if (r.nombreCliente == null || r.nombreCliente.isBlank()) {
            throw new RuntimeException("El nombre del cliente es obligatorio");
        }
        if (r.fechaHora == null) {
            throw new RuntimeException("La fecha y hora de la reserva son obligatorias");
        }
        if (r.numeroPersonas == null || r.numeroPersonas <= 0) {
            throw new RuntimeException("El número de personas debe ser mayor a cero");
        }
    }

    @PostMapping
    public ResponseEntity<ReservaHoreca> crear(@RequestBody ReservaRequest request) {
        validar(request);
        ReservaHoreca reserva = new ReservaHoreca();
        reserva.setTenantId(TenantContext.getCurrentTenant());
        reserva.setNombreCliente(request.nombreCliente.trim());
        reserva.setTelefono(request.telefono != null && !request.telefono.isBlank() ? request.telefono.trim() : null);
        reserva.setFechaHora(request.fechaHora);
        reserva.setNumeroPersonas(request.numeroPersonas);
        reserva.setNumeroMesaSugerida(request.numeroMesaSugerida);
        reserva.setNotas(request.notas != null && !request.notas.isBlank() ? request.notas.trim() : null);
        return ResponseEntity.ok(reservaHorecaRepository.save(reserva));
    }

    private ReservaHoreca obtenerPropia(Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
        ReservaHoreca reserva = reservaHorecaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Reserva no encontrada"));
        if (!reserva.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Reserva no pertenece a este tenant");
        }
        return reserva;
    }

    @PutMapping("/{id}")
    public ResponseEntity<ReservaHoreca> editar(@PathVariable Long id, @RequestBody ReservaRequest request) {
        validar(request);
        ReservaHoreca reserva = obtenerPropia(id);
        reserva.setNombreCliente(request.nombreCliente.trim());
        reserva.setTelefono(request.telefono != null && !request.telefono.isBlank() ? request.telefono.trim() : null);
        reserva.setFechaHora(request.fechaHora);
        reserva.setNumeroPersonas(request.numeroPersonas);
        reserva.setNumeroMesaSugerida(request.numeroMesaSugerida);
        reserva.setNotas(request.notas != null && !request.notas.isBlank() ? request.notas.trim() : null);
        return ResponseEntity.ok(reservaHorecaRepository.save(reserva));
    }

    @PutMapping("/{id}/estado")
    public ResponseEntity<ReservaHoreca> cambiarEstado(@PathVariable Long id, @RequestParam ReservaHoreca.EstadoReserva nuevoEstado) {
        ReservaHoreca reserva = obtenerPropia(id);
        reserva.setEstado(nuevoEstado);
        return ResponseEntity.ok(reservaHorecaRepository.save(reserva));
    }
}
