package com.auroraplus.core.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * Hasta este archivo, ningún controlador de todo el backend tenía un manejo
 * global de errores: cada `throw new RuntimeException("mensaje amigable...")`
 * escrito en cualquier servicio/controlador terminaba en la respuesta 500 por
 * defecto de Spring Boot, que NO incluye el mensaje real en el body (solo
 * "Internal Server Error", a menos que se configure
 * server.error.include-message=always — y eso además expondría mensajes de
 * excepciones internas no controladas, no solo las de validación de negocio).
 *
 * Resultado antes de esto: el frontend (api.ts -> request(), que ya sabía
 * leer `body.message`) nunca tenía nada real que leer, y cientos de mensajes
 * de error ya escritos en español a lo largo de todo el código jamás
 * llegaban al usuario — daba igual cuán clara fuera la excepción, la UI
 * mostraba silencio o "Error 500" genérico. Esto no es un fix de un
 * endpoint puntual: es la razón de fondo por la que "no pasa nada" al
 * fallar una operación en cualquier parte de la aplicación.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Las reglas de negocio de este backend se validan lanzando
     * RuntimeException con un mensaje ya pensado para mostrarse tal cual
     * ("El costo unitario es obligatorio...", "Solo se puede cerrar una
     * comanda que está ABIERTA", etc.) — se devuelven como 400 con ese
     * mensaje intacto.
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> manejarRuntimeException(RuntimeException ex) {
        log.warn("Error de negocio: {}", ex.getMessage());
        return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage() != null ? ex.getMessage() : "Ocurrió un error inesperado"));
    }

    /**
     * Violación de integridad referencial (ej. eliminar un artículo que ya
     * tiene Kardex, compras o se usa en una receta) — el mensaje real de la
     * base de datos no es apto para mostrar a un usuario, así que se traduce
     * a uno genérico pero honesto sobre la causa.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> manejarIntegridad(DataIntegrityViolationException ex) {
        log.warn("Violación de integridad referencial: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message",
            "No se puede completar esta acción: el registro ya está en uso en otra parte del sistema (movimientos, ventas o referencias asociadas)."));
    }

    /**
     * Bloqueo optimista (@Version, ver Articulo) — otra operación modificó el
     * mismo registro (típicamente stock) entre que se leyó y se guardó acá.
     * 409 en vez de 500: el usuario debe reintentar con el dato ya
     * actualizado, no es un error del servidor.
     */
    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<Map<String, String>> manejarBloqueoOptimista(ObjectOptimisticLockingFailureException ex) {
        log.warn("Conflicto de concurrencia (bloqueo optimista): {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message",
            "Otra operación modificó este registro al mismo tiempo (posible venta simultánea). Recarga e intenta de nuevo."));
    }
}
