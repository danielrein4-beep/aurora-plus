package com.auroraplus.core.auth.repositories;

import com.auroraplus.core.auth.entities.TokenRecuperacionClave;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TokenRecuperacionClaveRepository extends JpaRepository<TokenRecuperacionClave, Long> {

    Optional<TokenRecuperacionClave> findByToken(String token);
}
