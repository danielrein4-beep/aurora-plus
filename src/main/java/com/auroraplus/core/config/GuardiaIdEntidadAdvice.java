package com.auroraplus.core.config;

import jakarta.persistence.Entity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.RequestBodyAdviceAdapter;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Type;
import java.util.Objects;

/**
 * Guardia central contra "pisar" o enlazar registros de otro negocio.
 *
 * Muchos endpoints reciben la entidad JPA directamente en el body, le ponen el
 * tenant de la sesión y llaman save(). Como el filtro de tenant no aplica a las
 * búsquedas por id, dos cosas eran posibles con una cuenta propia:
 * - mandar el "id" de una fila de otro tenant: Hibernate la cargaba, la
 *   sobrescribía y se la quedaba;
 * - enlazar una relación a un registro ajeno ({"paciente": {"id": 812}}) y
 *   luego ver sus datos al listar.
 * En vez de corregir cada controller, aquí se revisa todo body que sea una
 * entidad: su id y sus relaciones @ManyToOne/@OneToOne deben ser del tenant de
 * la sesión. Lo propio y lo nuevo (sin id) pasa igual que antes.
 */
@ControllerAdvice
public class GuardiaIdEntidadAdvice extends RequestBodyAdviceAdapter {

    @Autowired
    private EntityManager entityManager;

    @Override
    public boolean supports(MethodParameter parameter, Type targetType, Class<? extends HttpMessageConverter<?>> converterType) {
        return targetType instanceof Class<?> clase && clase.isAnnotationPresent(Entity.class);
    }

    @Override
    public Object afterBodyRead(Object body, HttpInputMessage inputMessage, MethodParameter parameter, Type targetType,
                                Class<? extends HttpMessageConverter<?>> converterType) {
        Long tenant = TenantContext.getCurrentTenant();
        if (body == null || tenant == null) return body; // sin tenant (login, rutas públicas, super-admin): no aplica
        exigirDelTenant(body, tenant);
        for (Class<?> c = body.getClass(); c != null && c != Object.class; c = c.getSuperclass()) {
            for (Field campo : c.getDeclaredFields()) {
                if (!campo.isAnnotationPresent(ManyToOne.class) && !campo.isAnnotationPresent(OneToOne.class)) continue;
                try {
                    campo.setAccessible(true);
                    Object relacionado = campo.get(body);
                    if (relacionado != null && relacionado.getClass().isAnnotationPresent(Entity.class)) {
                        exigirDelTenant(relacionado, tenant);
                    }
                } catch (IllegalAccessException | RuntimeException e) {
                    if (e instanceof ResponseStatusException r) throw r;
                    // campo inaccesible: se deja pasar, el resto de validaciones sigue igual
                }
            }
        }
        return body;
    }

    private void exigirDelTenant(Object entidad, Long tenant) {
        Object id = entityManager.getEntityManagerFactory().getPersistenceUnitUtil().getIdentifier(entidad);
        if (id == null) return;
        Object existente = entityManager.find(entidad.getClass(), id);
        if (existente == null) return;
        Object duenio = tenantDe(existente);
        if (duenio != null && !Objects.equals(String.valueOf(duenio), String.valueOf(tenant))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Registro no encontrado");
        }
    }

    private static Object tenantDe(Object entidad) {
        try {
            Method getter = entidad.getClass().getMethod("getTenantId");
            return getter.invoke(entidad);
        } catch (NoSuchMethodException e) {
            return null; // entidad de plataforma, sin tenant
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo leer el tenant de " + entidad.getClass().getSimpleName(), e);
        }
    }
}
