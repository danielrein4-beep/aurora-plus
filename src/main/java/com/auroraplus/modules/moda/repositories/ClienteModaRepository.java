package com.auroraplus.modules.moda.repositories;

import com.auroraplus.modules.moda.entities.ClienteModa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClienteModaRepository extends JpaRepository<ClienteModa, Long> {
}
