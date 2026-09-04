package com.auroraplus.core.config;

import com.fasterxml.jackson.datatype.hibernate6.Hibernate6Module;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Sin este módulo, Jackson intenta serializar el proxy ByteBuddy que Hibernate
 * genera para cualquier relación @ManyToOne/@OneToOne LAZY no inicializada
 * (en vez de la entidad real), y revienta con
 * "Type definition error: [simple type, class org.hibernate.proxy.pojo.bytebuddy.ByteBuddyInterceptor]".
 * Aplica a cualquier entidad con relaciones LAZY en todo el proyecto, no solo
 * a una — de ahí el módulo global en vez de parchear entidad por entidad.
 *
 * USE_TRANSIENT_ANNOTATION va desactivado a propósito: por defecto el módulo
 * trata jakarta.persistence.@Transient igual que @JsonIgnore, pero en este
 * proyecto @Transient se usa también para exponer getters calculados (ej.
 * getUtilidadUnitaria() en RepuestoItem/ProductoModa) que SÍ deben viajar en
 * el JSON — solo significan "no persistir en BD", no "no serializar".
 */
@Configuration
public class JacksonConfig {

    @Bean
    public Hibernate6Module hibernate6Module() {
        Hibernate6Module module = new Hibernate6Module();
        module.disable(Hibernate6Module.Feature.USE_TRANSIENT_ANNOTATION);
        return module;
    }
}
