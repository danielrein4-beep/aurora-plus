package com.auroraplus.core.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

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
    /**
     * ResponseStatusException es una RuntimeException, asi que sin este manejador
     * el de abajo la convertia en 400: un 403 de permisos, un 404 de "no encontrado"
     * o un 409 de colision llegaban como 400 y con el mensaje ensuciado
     * ("403 FORBIDDEN \"Acceso denegado\""). Se respeta el codigo que eligio quien la lanzo.
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> manejarResponseStatus(ResponseStatusException ex) {
        log.warn("Error {}: {}", ex.getStatusCode().value(), ex.getReason());
        String mensaje = ex.getReason() != null ? ex.getReason() : "Ocurrió un error inesperado";
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", mensaje));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> manejarRuntimeException(RuntimeException ex) {
        // Un fallo de programación o de base de datos no es una regla de negocio: su mensaje
        // (nombres de tablas, SQL, "Cannot invoke ... because null") no debe llegar al usuario, y
        // tiene que quedar como ERROR con la traza para que Sentry lo vea (antes era un warn y un 400).
        if (esErrorTecnico(ex)) {
            log.error("Error interno no controlado", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message",
                "Ocurrió un error interno. Ya quedó registrado; intenta de nuevo y, si se repite, escríbenos a soporte."));
        }
        log.warn("Error de negocio: {}", ex.getMessage());
        return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage() != null ? ex.getMessage() : "Ocurrió un error inesperado"));
    }

    /** Un id con letras en la URL o un JSON mal armado: es un 400, pero sin el texto interno de Spring. */
    @ExceptionHandler({
        org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,
        org.springframework.http.converter.HttpMessageNotReadableException.class
    })
    public ResponseEntity<Map<String, String>> manejarDatoMalFormado(RuntimeException ex) {
        log.warn("Petición con datos mal formados: {}", ex.getMessage());
        return ResponseEntity.badRequest().body(Map.of("message", "Los datos enviados no tienen el formato correcto."));
    }

    private static boolean esErrorTecnico(RuntimeException ex) {
        return ex.getMessage() == null
            || ex instanceof NullPointerException
            || ex instanceof ClassCastException
            || ex instanceof IndexOutOfBoundsException
            || ex instanceof ArithmeticException
            || ex instanceof UnsupportedOperationException
            || ex instanceof org.springframework.dao.DataAccessException
            || ex instanceof jakarta.persistence.PersistenceException
            || ex instanceof org.hibernate.HibernateException;
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
