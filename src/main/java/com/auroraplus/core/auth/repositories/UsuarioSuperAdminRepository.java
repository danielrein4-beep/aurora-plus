package com.auroraplus.core.auth.repositories;

import com.auroraplus.core.auth.entities.UsuarioSuperAdmin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsuarioSuperAdminRepository extends JpaRepository<UsuarioSuperAdmin, Long> {
    Optional<UsuarioSuperAdmin> findByUsername(String username);
}
