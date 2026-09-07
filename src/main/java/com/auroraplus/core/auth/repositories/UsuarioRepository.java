package com.auroraplus.core.auth.repositories;

import com.auroraplus.core.auth.entities.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository("coreUsuarioRepository")
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    // Sin filtro de tenant activo todavía en este punto del login (es lo que
    // estamos resolviendo) — por eso la query es explícita por tenantId+username,
    // no depende del Hibernate filter.
    @Query("SELECT u FROM UsuarioAuth u WHERE u.tenantId = :tenantId AND u.username = :username")
    Optional<Usuario> buscarPorTenantYUsername(@Param("tenantId") Long tenantId, @Param("username") String username);

    List<Usuario> findByTenantId(Long tenantId);

    // El username solo es único por tenant (ver constraint en Usuario) — para el
    // login por correo, sin que el cliente conozca su tenantId, se busca en todos
    // los tenants; si hay más de una coincidencia se le pide al usuario que
    // desambigüe (caso raro: mismo username elegido en dos negocios distintos).
    @Query("SELECT u FROM UsuarioAuth u WHERE u.username = :username")
    List<Usuario> buscarPorUsernameEnTodosLosTenants(@Param("username") String username);
}
