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
}
